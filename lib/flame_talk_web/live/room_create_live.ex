defmodule FlameTalkWeb.RoomCreateLive do
  use FlameTalkWeb, :live_view
  alias FlameTalk.Rooms
  alias FlameTalk.Rooms.Room

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, form: to_form(Rooms.change_room(%Room{})))}
  end

  @impl true
  def handle_event("validate", %{"room" => room_params}, socket) do
    changeset =
      %Room{}
      |> Rooms.change_room(room_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, form: to_form(changeset))}
  end

  @impl true
  def handle_event("save", %{"room" => room_params}, socket) do
    case Rooms.create_room(room_params) do
      {:ok, room} ->
        {:noreply,
         socket
         |> put_flash(:info, "Room created successfully")
         |> redirect(to: ~p"/rooms/#{room}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, form: to_form(changeset))}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="max-w-md mx-auto mt-8">
      <h1 class="text-2xl font-bold mb-4">Create a New Room</h1>
      <.simple_form for={@form} id="room-form" phx-change="validate" phx-submit="save">
        <.input field={@form[:name]} type="text" label="Name" required />
        <.input field={@form[:description]} type="textarea" label="Description" />
        <.input
          field={@form[:category]}
          type="select"
          label="Category"
          prompt="Select a category"
          options={[{"Gaming", "gaming"}, {"Education", "education"}, {"Social", "social"}]}
          required
        />
        <:actions>
          <.button phx-disable-with="Creating..." class="w-full">
            Create Room <span aria-hidden="true">→</span>
          </.button>
        </:actions>
      </.simple_form>
    </div>
    """
  end
end
