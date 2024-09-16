defmodule FlameTalkWeb.Presence do
  use Phoenix.Presence,
    otp_app: :flame_talk,
    pubsub_server: FlameTalk.PubSub

  def init(_opts) do
    {:ok, %{}}
  end

  def handle_metas(topic, %{joins: joins, leaves: leaves}, _presences, state) do
    for {user_id, _} <- joins do
      Phoenix.PubSub.subscribe(FlameTalk.PubSub, "user_presence:#{user_id}")
    end

    for {user_id, _} <- leaves do
      Phoenix.PubSub.unsubscribe(FlameTalk.PubSub, "user_presence:#{user_id}")
    end

    {:ok, state}
  end
end
