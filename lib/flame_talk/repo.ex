defmodule FlameTalk.Repo do
  use Ecto.Repo,
    otp_app: :flame_talk,
    adapter: Ecto.Adapters.Postgres
end
