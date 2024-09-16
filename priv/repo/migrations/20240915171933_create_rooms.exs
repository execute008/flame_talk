defmodule FlameTalk.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms) do
      add :name, :string, null: false
      add :description, :text
      add :category, :string, null: false
      add :participant_count, :integer, default: 0

      timestamps()
    end

    create index(:rooms, [:category])
  end
end
