defmodule YourAppWeb.Components.Icons do
  use Phoenix.Component

  @doc "Fullscreen icon"
  def fullscreen_icon(assigns) do
    assigns = assign_new(assigns, :class, fn -> "h-6 w-6" end)
    ~H"""
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class={@class}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5
           M4 16v4m0 0h4m-4 0l5-5
           m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
    """
  end

  @doc "Exit fullscreen icon"
  def exit_fullscreen_icon(assigns) do
    assigns = assign_new(assigns, :class, fn -> "h-6 w-6" end)
    ~H"""
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class={@class}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75
           M9 15v4.5M9 15H4.5M9 15l-5.25 5.25
           M15 9h4.5M15 9V4.5M15 9l5.25-5.25
           M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
      />
    </svg>
    """
  end
end
