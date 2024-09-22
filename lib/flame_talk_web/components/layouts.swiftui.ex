defmodule FlameTalkWeb.Layouts.SwiftUI do
  use FlameTalkNative, [:layout, format: :swiftui]

  embed_templates "layouts_swiftui/*"
end
