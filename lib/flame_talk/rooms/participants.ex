defmodule FlameTalk.Rooms.Participant do
  use Ecto.Schema
  import Ecto.Changeset

  schema "room_participants" do
    field :user_id, :string
    belongs_to :room, FlameTalk.Rooms.Room

    timestamps()
  end

  def changeset(participant, attrs) do
    participant
    |> cast(attrs, [:user_id])
    |> validate_required([:user_id])
  end
end
