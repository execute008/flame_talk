defmodule FlameTalk.Rooms.Room do
  use Ecto.Schema
  import Ecto.Changeset

  schema "rooms" do
    field :name, :string
    field :description, :string
    field :category, :string
    has_many :participants, FlameTalk.Rooms.Participant

    timestamps()
  end

  def changeset(room, attrs) do
    room
    |> cast(attrs, [:name, :description, :category, :participant_count])
    |> validate_required([:name, :category])
  end
end
