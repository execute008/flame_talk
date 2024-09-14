defmodule FlameTalk.Repo.Migrations.CreateRoomParticipants do
  use Ecto.Migration

  def change do
    create table(:room_participants) do
      add :room_id, references(:rooms, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:room_participants, [:room_id, :user_id])
  end
end
