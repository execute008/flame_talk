defmodule FlameTalk.Repo.Migrations.CreateRoomParticipants do
  use Ecto.Migration

  def change do
    create table(:room_participants) do
      add :user_id, :string, null: false
      add :room_id, references(:rooms, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:room_participants, [:room_id])
    create unique_index(:room_participants, [:room_id, :user_id])
  end
end
