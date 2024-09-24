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

  def exit_room_icon(assigns) do
    assigns = assign_new(assigns, :class, fn -> "h-6 w-6" end)

    ~H"""
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
    """
  end

  def chat_icon(assigns) do
    ~H"""
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
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
    """
  end

  def send_icon(assigns) do
    ~H"""
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
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
    """
  end
end
