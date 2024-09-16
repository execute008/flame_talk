defmodule FlameTalkWeb.RoomListLive do
  use FlameTalkWeb, :live_view
  alias FlameTalk.Rooms

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket,
      rooms: Rooms.list_rooms(),
      search_term: "",
      category: "all"
    )}
  end

  @impl true
  def handle_event("search", %{"search" => search_term}, socket) do
    filtered_rooms = Rooms.search_rooms(search_term, socket.assigns.category)
    {:noreply, assign(socket, rooms: filtered_rooms, search_term: search_term)}
  end

  @impl true
  def handle_event("filter_category", %{"category" => category}, socket) do
    filtered_rooms = Rooms.search_rooms(socket.assigns.search_term, category)
    {:noreply, assign(socket, rooms: filtered_rooms, category: category)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-4">Room List</h1>

      <div class="mb-4">
        <form phx-change="search" class="flex items-center">
          <input type="text" name="search" value={@search_term} placeholder="Search rooms..." class="form-input px-4 py-2 w-full" />
        </form>
      </div>

      <div class="mb-4">
        <select phx-change="filter_category" name="category" class="form-select px-4 py-2">
          <option value="all">All Categories</option>
          <option value="gaming">Gaming</option>
          <option value="education">Education</option>
          <option value="social">Social</option>
          <!-- Add more categories as needed -->
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <%= for room <- @rooms do %>
          <div class="bg-white shadow rounded-lg p-4">
            <h2 class="text-xl font-semibold mb-2"><%= room.name %></h2>
            <p class="text-gray-600 mb-2"><%= room.description %></p>
            <p class="text-sm text-gray-500 mb-2">Category: <%= room.category %></p>
            <p class="text-sm text-gray-500 mb-4">Participants: <%= Rooms.get_participant_count(room) %></p>
            <a href={~p"/rooms/#{room.id}"} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Join Room
            </a>
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
