defmodule FlameTalkWeb.HomeLive.SwiftUI do
  use FlameTalkNative, [:render_component, format: :swiftui]

  @impl true
  def render(%{platform_id: :swiftui} = assigns) do
    ~SWIFTUI"""
    <Text>Hello, LiveView Native!</Text>
    """
  end
end
