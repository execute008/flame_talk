defmodule FlameTalk.Rooms do
  alias FlameTalk.Repo
  alias FlameTalk.Rooms.Room
  alias FlameTalk.Rooms.Participant
  import Ecto.Query


  def create_room(attrs \\ %{}) do
    %Room{}
    |> Room.changeset(attrs)
    |> Repo.insert()
  end

  def change_room(%Room{} = room, attrs \\ %{}) do
    Room.changeset(room, attrs)
  end

  def list_rooms do
    Room
    |> Repo.all()
    |> Repo.preload(:participants)
  end

  def get_room!(id) do
    Room
    |> Repo.get!(id)
    |> Repo.preload(:participants)
  end

  def get_participant_count(%Room{participants: participants}) when is_list(participants) do
    length(participants)
  end

  def search_rooms(search_term, category) do
    Room
    |> filter_by_search_term(search_term)
    |> filter_by_category(category)
    |> Repo.all()
  end

  def add_participant(room, user_id) do
    %Participant{room_id: room.id, user_id: user_id}
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:room_id, :user_id]
    )
    |> case do
      {:ok, _participant} -> {:ok, get_room!(room.id)}
      {:error, _} -> {:ok, get_room!(room.id)}  # Even if it's a conflict, we consider it successful
    end
  end

  def remove_participant(room, user_id) do
    query = from p in Participant, where: p.room_id == ^room.id and p.user_id == ^user_id
    Repo.delete_all(query)

    {:ok, get_room!(room.id)}
  end

  defp filter_by_search_term(query, ""), do: query

  defp filter_by_search_term(query, search_term) do
    where(
      query,
      [r],
      ilike(r.name, ^"%#{search_term}%") or ilike(r.description, ^"%#{search_term}%")
    )
  end

  defp filter_by_category(query, "all"), do: query

  defp filter_by_category(query, category) do
    where(query, [r], r.category == ^category)
  end

end
