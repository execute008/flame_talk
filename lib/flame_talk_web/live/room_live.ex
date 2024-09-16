defmodule FlameTalkWeb.RoomLive do
  use FlameTalkWeb, :live_view
  alias FlameTalkWeb.Presence
  alias FlameTalk.Rooms

  @impl true
  def mount(%{"id" => room_id}, session, socket) do
    Process.flag(:trap_exit, true)

    topic = "room:" <> room_id

    if connected?(socket) do
      FlameTalkWeb.Endpoint.subscribe(topic)
      Phoenix.PubSub.subscribe(FlameTalk.PubSub, "user_presence:#{room_id}")
    end

    user_id =
      session["user_token"]
      |> to_string()
      |> Base.url_encode64(padding: false)

    room = Rooms.get_room!(room_id)

    {:ok,
     assign(socket,
       room_id: room_id,
       room: room,
       topic: topic,
       user_id: user_id,
       joined: false,
       users: [],
       fullscreen: false
     )}
  end

  @impl true
  def handle_event("join", _, socket) do
    %{room: room, user_id: user_id, topic: topic} = socket.assigns

    case Rooms.add_participant(room, user_id) do
      {:ok, updated_room} ->
        {:ok, _} = Presence.track(self(), topic, user_id, %{})
        users = list_present_users(topic)
        FlameTalkWeb.Endpoint.broadcast_from(self(), topic, "user_joined", %{user_id: user_id})

        {:noreply,
         socket
         |> assign(joined: true, users: users, room: updated_room)
         |> push_event("joined_room", %{users: users})}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to join the room")}
    end
  end

  @impl true
  def handle_event("leave", _, socket) do
    %{room: room, user_id: user_id, topic: topic} = socket.assigns

    case Rooms.remove_participant(room, user_id) do
      {:ok, updated_room} ->
        Presence.untrack(self(), topic, user_id)
        FlameTalkWeb.Endpoint.broadcast(topic, "user_left", %{user_id: user_id})
        {:noreply, assign(socket, joined: false, users: [], room: updated_room)}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to leave the room")}
    end
  end

  @impl true
  def handle_event("ready_to_connect", _, socket) do
    IO.puts("Received ready_to_connect event from #{socket.assigns.user_id}")
    FlameTalkWeb.Endpoint.broadcast(socket.assigns.topic, "ready_to_connect", %{
      user_id: socket.assigns.user_id
    })
    {:noreply, socket}
  end

  @impl true
  def handle_event("webrtc_signal", %{"signal" => signal, "to" => to}, socket) do
    IO.puts("Received webrtc_signal from #{socket.assigns.user_id} to #{to}")

    FlameTalkWeb.Endpoint.broadcast(socket.assigns.topic, "webrtc_signal", %{
      from: socket.assigns.user_id,
      to: to,
      signal: signal
    })

    {:noreply, socket}
  end

  @impl true
  def handle_event("toggle_fullscreen", _, socket) do
    {:noreply, assign(socket, fullscreen: !socket.assigns.fullscreen)}
  end

  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "ready_to_connect", payload: %{user_id: user_id}}, socket) do
    IO.puts("Received ready_to_connect broadcast for user: #{user_id}")
    {:noreply, push_event(socket, "user_ready", %{user_id: user_id})}
  end

  @impl true
  def handle_info(%{event: "presence_diff"}, socket) do
    users = list_present_users(socket.assigns.topic)
    {:noreply, assign(socket, users: users)}
  end

  @impl true
  def handle_info(%{event: "user_joined", payload: %{user_id: user_id}}, socket) do
    IO.puts("Received user_joined event for #{user_id}")
    users = [user_id | socket.assigns.users] |> Enum.uniq()
    updated_room = Rooms.get_room!(socket.assigns.room_id)

    {:noreply,
     socket
     |> assign(users: users, room: updated_room)
     |> push_event("user_joined", %{user_id: user_id})}
  end

  @impl true
  def handle_info(%{event: "user_left", payload: %{user_id: user_id}}, socket) do
    IO.puts("Received user_left event for #{user_id}")
    users = Enum.filter(socket.assigns.users, &(&1 != user_id))
    updated_room = Rooms.get_room!(socket.assigns.room_id)

    {:noreply,
     socket
     |> assign(users: users, room: updated_room)
     |> push_event("user_left", %{user_id: user_id})}
  end

  @impl true
  def handle_info(%{event: "user_ready", payload: %{user_id: user_id}}, socket) do
    IO.puts("Received user_ready event for #{user_id}")
    {:noreply, push_event(socket, "user_joined", %{user_id: user_id})}
  end

  @impl true
  def handle_info(%{event: "webrtc_signal", payload: payload}, socket) do
    IO.puts("Received webrtc_signal event from #{payload.from} to #{payload.to}")

    if payload.to == socket.assigns.user_id do
      {:noreply, push_event(socket, "webrtc_signal", payload)}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:DOWN, _, :process, _, _}, socket) do
    leave_room(socket)
    {:noreply, socket}
  end

  @impl true
  def terminate(reason, socket) do
    leave_room(socket)
    {:noreply, socket}
  end

  defp leave_room(socket) do
    %{room: room, user_id: user_id, topic: topic} = socket.assigns
    Rooms.remove_participant(room, user_id)
    Presence.untrack(self(), topic, user_id)
    FlameTalkWeb.Endpoint.broadcast(topic, "user_left", %{user_id: user_id})
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div
      class="container mx-auto px-4 py-8"
      id="room"
      phx-hook="WebRTC"
      data-room-id={@room_id}
      data-user-id={@user_id}
    >
      <h1 class="text-3xl font-bold mb-4"><%= @room.name %></h1>
      <%= if @joined do %>
        <div id="video-container" class={if @fullscreen, do: "fullscreen", else: ""}>
          <div id="remote-videos" class={"grid gap-4 #{grid_class(length(@users) - 1)}"}>
            <%= for user_id <- @users do %>
              <%= if user_id != @user_id do %>
                <div class="relative video-aspect-ratio">
                  <video
                    id={"remote-video-#{user_id}"}
                    data-user-id={user_id}
                    autoplay
                    playsinline
                    class="object-cover rounded-lg"
                  >
                  </video>
                  <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    <%= String.slice(user_id, 0..5) %>...
                  </div>
                </div>
              <% end %>
            <% end %>
          </div>
          <div id="local-video-container" class="absolute bottom-4 right-4 w-1/4 max-w-xs">
            <video
              id="local-video"
              autoplay
              muted
              playsinline
              class="w-full h-full object-cover rounded-lg shadow-lg"
            >
            </video>
          </div>
          <button
            phx-click="leave"
            class="absolute top-4 left-4 z-10 bg-red-500 hover:bg-red-700 text-white p-2 rounded-full shadow-lg"
            title="Leave Room"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
          <button
            phx-click="toggle_fullscreen"
            class="absolute top-4 right-4 z-10 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
            title="Toggle Fullscreen"
          >
            <%= if @fullscreen do %>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            <% else %>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            <% end %>
          </button>
        </div>
      <% else %>
        <div class="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-2"><%= @room.name %></h2>
          <p class="text-gray-600 mb-4"><%= @room.description %></p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-gray-500">Category: <%= @room.category %></span>
            <span class="text-sm text-gray-500">
              Participants: <%= Rooms.get_participant_count(@room) %>
            </span>
          </div>
          <button
            phx-click="join"
            class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
          >
            Join Video
          </button>
        </div>
      <% end %>
    </div>
    """
  end

  defp grid_class(users_count) do
    case users_count do
      1 -> "grid-cols-1"
      2 -> "grid-cols-1 sm:grid-cols-2"
      3 -> "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      4 -> "grid-cols-2 sm:grid-cols-2"
      n when n in 5..6 -> "grid-cols-2 sm:grid-cols-3"
      _ -> "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    end
  end

  defp list_present_users(topic) do
    Presence.list(topic)
    |> Map.keys()
  end
end
