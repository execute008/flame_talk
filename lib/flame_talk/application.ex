defmodule FlameTalk.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      FlameTalkWeb.Telemetry,
      FlameTalk.Repo,
      {DNSCluster, query: Application.get_env(:flame_talk, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: FlameTalk.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: FlameTalk.Finch},
      # Start a worker by calling: FlameTalk.Worker.start_link(arg)
      # {FlameTalk.Worker, arg},
      # Start to serve requests, typically the last entry
      FlameTalkWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: FlameTalk.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    FlameTalkWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
