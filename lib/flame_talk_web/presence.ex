defmodule FlameTalkWeb.Presence do
  use Phoenix.Presence,
    otp_app: :flame_talk,
    pubsub_server: FlameTalk.PubSub
end
