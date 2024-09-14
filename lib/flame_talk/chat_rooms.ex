defmodule FlameTalk.ChatRooms do
  import Ecto.Query, warn: false
  alias FlameTalk.Repo
  alias FlameTalk.ChatRooms.Room

  def list_rooms do
    Repo.all(Room)
  end

  def get_room!(id), do: Repo.get!(Room, id)

  def create_room(attrs \\ %{}) do
    %Room{}
    |> Room.changeset(attrs)
    |> Repo.insert()
  end

  def join_room(room_id, user_id) do
    room = get_room!(room_id)
    user = FlameTalk.Accounts.get_user!(user_id)

    room
    |> Repo.preload(:participants)
    |> Ecto.Changeset.change()
    |> Ecto.Changeset.put_assoc(:participants, [user | room.participants])
    |> Repo.update()
  end

  def list_participants(room_id) do
    Room
    |> Repo.get!(room_id)
    |> Repo.preload(:participants)
    |> Map.get(:participants)
  end
end
