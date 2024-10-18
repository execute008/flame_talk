defmodule FlameTalkWeb.RoomLive do
  alias FlameTalkWeb.GameComponent
  use FlameTalkWeb, :live_view
  alias FlameTalkWeb.Presence
  alias FlameTalk.Rooms
  alias FlameTalkWeb.VideoContainerComponent
  alias FlameTalkWeb.ChatboxComponent

  alias FlameTalkWeb.Components.Icons

  @tick_rate 30
  @interpolation_delay 100
  @max_extrapolation_time 200

  @impl true
  def mount(%{"id" => room_id}, session, socket) do
    Process.flag(:trap_exit, true)

    topic = "room:" <> room_id

    if connected?(socket) do
      FlameTalkWeb.Endpoint.subscribe(topic)
      Phoenix.PubSub.subscribe(FlameTalk.PubSub, "user_presence:#{room_id}")
    end

    if connected?(socket) do
      :timer.send_interval(trunc(1000 / @tick_rate), :tick)
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
       chat_visible: true,
       x: 0,
       z: 0,
       game_visible: false,
       players: %{},
       last_processed_input: %{},
       last_interpolated_players: %{}
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
  def handle_event("toggle_game", _, socket) do
    {:noreply, assign(socket, game_visible: !socket.assigns.game_visible)}
  end

  @impl true
  def handle_event("player_input", %{"input" => input}, socket) do
    %{user_id: user_id, players: players} = socket.assigns
    current_time = System.system_time(:millisecond)

    updated_player = Map.get(players, user_id, %{x: 0, z: 0, dx: 0, dz: 0, last_update: current_time})
    |> apply_input(input)
    |> Map.put(:last_update, current_time)

    updated_players = Map.put(players, user_id, updated_player)

    FlameTalkWeb.Endpoint.broadcast(socket.assigns.topic, "player_state", %{
      user_id: user_id,
      x: updated_player.x,
      z: updated_player.z,
      timestamp: current_time
    })

    {:noreply, assign(socket, players: updated_players)}
  end

  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "new_message", payload: new_message}, socket) do
    {:noreply,
     socket
     |> stream_insert(:messages, new_message)
     |> push_event("new_message", %{})}
  end

  @impl true
  def handle_info(:tick, socket) do
    if socket.assigns.game_visible do
      current_time = System.system_time(:millisecond)
      interpolation_point = current_time - @interpolation_delay

      interpolated_players = Enum.map(socket.assigns.players, fn {user_id, player} ->
        {user_id, interpolate_player(player, interpolation_point)}
      end)
      |> Map.new()

      last_interpolated = Map.get(socket.assigns, :last_interpolated_players, %{})

      if players_changed?(last_interpolated, interpolated_players) do
        {:noreply, socket
                   |> assign(:last_interpolated_players, interpolated_players)
                   |> push_event("update_players", %{players: interpolated_players})}
      else
        {:noreply, socket}
      end
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "player_state", payload: payload}, socket) do
    %{user_id: user_id, x: x, z: z, timestamp: timestamp} = payload
    current_players = socket.assigns.players

    updated_player = Map.get(current_players, user_id, %{})
    |> Map.merge(%{x: x, z: z, last_update: timestamp})

    updated_players = Map.put(current_players, user_id, updated_player)

    {:noreply, assign(socket, players: updated_players)}
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


  defp apply_input(player, input) do
    speed = 0.1
    dx = (input["right"] - input["left"]) * speed
    dz = (input["down"] - input["up"]) * speed

    %{player |
      x: player.x + dx,
      z: player.z + dz,
      dx: dx,
      dz: dz
    }
  end

  defp players_changed?(last_players, current_players) do
    last_players != current_players
  end

  defp interpolate_player(player, interpolation_point) do
    time_difference = interpolation_point - player.last_update

    cond do
      time_difference <= 0 ->
        # If the interpolation point is in the past, just use the player's current position
        player

      time_difference > @max_extrapolation_time ->
        # If we're extrapolating too far into the future, cap it
        t = @max_extrapolation_time / 1000
        %{player |
          x: player.x + (Map.get(player, :dx, 0) * t),
          z: player.z + (Map.get(player, :dz, 0) * t)
        }

      true ->
        # Hermite interpolation
        t = time_difference / 1000
        t2 = t * t
        t3 = t2 * t

        h1 = 2 * t3 - 3 * t2 + 1
        h2 = -2 * t3 + 3 * t2
        h3 = t3 - 2 * t2 + t
        h4 = t3 - t2

        dx = Map.get(player, :dx, 0)
        dz = Map.get(player, :dz, 0)

        %{player |
          x: h1 * player.x + h2 * (player.x + dx) + h3 * dx + h4 * dx,
          z: h1 * player.z + h2 * (player.z + dz) + h3 * dz + h4 * dz
        }
    end
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
            game_visible={@game_visible}
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
          <.live_component
            module={GameComponent}
            id="game-component"
            room_id={@room_id}
            user_id={@user_id}
            game_visible={@game_visible}
          />
          <button
          phx-click="toggle_game"
          class="absolute bottom-4 left-4 z-10 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
          title="Toggle Game"
          >
            <%= if @game_visible do %>
            <Icons.exit_game_icon />
            <% else %>
            <Icons.game_icon />
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

  defp list_present_users(topic) do
    Presence.list(topic)
    |> Map.keys()
  end
end
