defmodule FlameTalkWeb.GameComponent do
  use FlameTalkWeb, :live_component

  def render(assigns) do
    ~H"""
      <div id="game-container" class="fixed top-0 left-0 -z-10" phx-hook="GameHook" data-room-id={@room_id} data-user-id={@user_id}>
      <canvas id="game-canvas"></canvas>
    </div>
    """
  end
end
