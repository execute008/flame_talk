defmodule FlameTalkWeb.ChatboxComponent do
  use FlameTalkWeb, :live_component
  alias FlameTalkWeb.Components.Icons

  def render(assigns) do
    ~H"""
    <div id="chatbox-container" class="absolut left-0 top-0" phx-hook="ChatBox">
      <div class="fixed bottom-4 right-4 md:relative md:top-auto md:right-auto md:w-full md:ml-4 z-[9999]">
        <div
          id="message-banner"
          class="hidden fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-lg shadow-lg z-50 cursor-pointer"
        >
          New message received!
        </div>
        <input type="checkbox" id="chat-toggle" class="hidden peer" checked={@chat_visible} />
        <label
          for="chat-toggle"
          class={"#{if @fullscreen do "" else "md:hidden" end} fixed bottom-4 left-4 z-20 bg-blue-500 text-white p-2 rounded-full shadow-lg cursor-pointer"}
        >
          <Icons.chat_icon />
        </label>

        <div
          id="chat-container"
          class={"fixed bottom-0 right-0 w-full h-2/3 md:h-auto md:w-full bg-white shadow-lg rounded-t-lg md:rounded-lg transform translate-y-full transition-transform duration-300 ease-in-out peer-checked:translate-y-0 #{if @fullscreen do "translate-y-0" else "md:translate-y-0 md:static md:shadow-none" end}"}
        >
          <div class="p-4">
            <h2 class="text-xl font-bold mb-4">Chat</h2>
            <div
              id="chat-messages"
              class="h-56 w-full overflow-y-auto border border-gray-300 rounded p-2 mb-2 space-y-2"
              phx-update="stream"
            >
              <div :for={{dom_id, message} <- @streams.messages} id={dom_id}>
                <div
                  class={"p-2 rounded-lg #{if message.user_id == @user_id, do: "bg-blue-100 ml-auto text-right", else: "bg-gray-100"}"}
                  style="max-width: 80%;"
                >
                  <span class={"font-bold #{if message.user_id == @user_id, do: "text-blue-600", else: "text-gray-600"}"}>
                  <%= if message.user_id == @user_id, do: "You", else: String.slice(message.user_id, 0..5) <> "..." %>
                </span>:
                  <span><%= message.message %></span>
                </div>
              </div>
            </div>
            <form phx-submit="send_message" phx-change="form_updated">
              <div class="flex-grow relative">
                <textarea
                  id="send_message"
                  name="message"
                  placeholder="Type a message..."
                  class="w-full border border-gray-300 rounded-l p-2 pr-10 resize-none overflow-hidden"
                  rows="1"
                  required
                  phx-hook="AutoResizeTextarea"
                  value={@message}
                ></textarea>
                <button
                  type="submit"
                  class="absolute right-2 bottom-2 text-blue-500 hover:text-blue-700"
                >
                  <Icons.send_icon />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
