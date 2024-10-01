defmodule FlameTalkWeb.RoomLive do
  use FlameTalkWeb, :live_view
  alias FlameTalkWeb.Presence
  alias FlameTalk.Rooms
  alias FlameTalkWeb.VideoContainerComponent
  alias FlameTalkWeb.ChatboxComponent

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
       fullscreen: false,
       message: "",
       chat_visible: false
     )
     |> stream_configure(:messages, dom_id: &"message-#{&1.id}")
     |> stream(:messages, [])}
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
    {:noreply, assign(socket, fullscreen: !socket.assigns.fullscreen, chat_visible: false)}
  end

  @impl true
  def handle_event("form_updated", %{"message" => message}, socket) do
    chat_visible = socket.assigns.chat_visible || socket.assigns.fullscreen
    {:noreply, assign(socket, message: message, chat_visible: chat_visible)}
  end

  @impl true
  def handle_event("send_message", %{"message" => message}, socket) do
    %{user_id: user_id, topic: topic} = socket.assigns

    new_message = %{
      id: Ecto.UUID.generate(),
      user_id: user_id,
      message: message,
      timestamp: NaiveDateTime.utc_now()
    }

    FlameTalkWeb.Endpoint.broadcast(topic, "new_message", new_message)

    {:noreply,
     socket
     |> stream_insert(:messages, new_message)
     |> assign(message: "")}
  end

  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "new_message", payload: new_message}, socket) do
    {:noreply,
     socket
     |> stream_insert(:messages, new_message)
     |> push_event("new_message", %{})}
  end

  @impl true
  def handle_info(
        %Phoenix.Socket.Broadcast{event: "ready_to_connect", payload: %{user_id: user_id}},
        socket
      ) do
    IO.puts("Received ready_to_connect broadcast for user: #{user_id}")
    {:noreply, push_event(socket, "ready_to_connect", %{user_id: user_id})}
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
  def terminate(_reason, socket) do
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
    <div class="container mx-auto px-4 py-2" id="room" data-room-id={@room_id} data-user-id={@user_id}>
      <h1 class="text-3xl font-bold mb-1"><%= @room.name %></h1>
      <%= if @joined do %>
        <div class="flex relative flex-col sm:flex-row">
          <.live_component
            module={VideoContainerComponent}
            id="video-container"
            fullscreen={@fullscreen}
            users={@users}
            user_id={@user_id}
          />
          <.live_component
            module={ChatboxComponent}
            id="chat-container"
            streams={@streams}
            user_id={@user_id}
            fullscreen={@fullscreen}
            chat_visible={@chat_visible}
            message={@message}

          />
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

  defp list_present_users(topic) do
    Presence.list(topic)
    |> Map.keys()
  end
end
