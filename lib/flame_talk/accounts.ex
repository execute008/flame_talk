defmodule FlameTalk.Accounts do
  import Ecto.Query, warn: false
  alias FlameTalk.Repo
  alias FlameTalk.Accounts.User

  def register_user(attrs \\ %{}) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  def get_user!(id), do: Repo.get!(User, id)
end
