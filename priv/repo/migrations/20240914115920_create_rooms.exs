defmodule FlameTalk.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms) do
      add :name, :string, null: false
      add :creator_id, references(:users, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:rooms, [:name])
    create index(:rooms, [:creator_id])
  end
end
