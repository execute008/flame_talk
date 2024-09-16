defmodule FlameTalkWeb.LiveHelpers do
  use Phoenix.Component

  def error_tag(assigns) do
    ~H"""
    <%= for error <- @errors do %>
      <span class="block mt-1 text-sm text-red-600" phx-feedback-for={@input_name}>
        <%= translate_error(error) %>
      </span>
    <% end %>
    """
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end
