defmodule FlameTalk.ChatRooms.Room do
  use Ecto.Schema
  import Ecto.Changeset

  schema "rooms" do
    field :name, :string
    belongs_to :creator, FlameTalk.Accounts.User
    many_to_many :participants, FlameTalk.Accounts.User, join_through: "room_participants"

    timestamps()
  end

  def changeset(room, attrs) do
    room
    |> cast(attrs, [:name, :creator_id])
    |> validate_required([:name, :creator_id])
    |> validate_length(:name, min: 3, max: 50)
    |> unique_constraint(:name)
  end
end
