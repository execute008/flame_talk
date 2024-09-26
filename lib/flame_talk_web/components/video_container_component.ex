defmodule FlameTalkWeb.VideoContainerComponent do
  use FlameTalkWeb, :live_component
  alias FlameTalkWeb.Components.Icons

  def render(assigns) do
    ~H"""
    <div
      id="video-container"
      phx-hook="WebRTC"
      class={if @fullscreen, do: "fullscreen", else: ""}
    >
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
        <Icons.exit_room_icon />
      </button>
      <button
        phx-click="toggle_fullscreen"
        class="absolute top-4 right-4 z-10 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
        title="Toggle Fullscreen"
      >
        <%= if @fullscreen do %>
          <Icons.exit_fullscreen_icon />
        <% else %>
          <Icons.fullscreen_icon />
        <% end %>
      </button>
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
end
