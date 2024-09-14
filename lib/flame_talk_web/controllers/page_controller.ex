defmodule FlameTalkWeb.PageController do
  use FlameTalkWeb, :controller

  def home(conn, _params) do
    render(conn, :home, layout: false)
  end
end
