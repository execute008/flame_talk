defmodule FlameTalkWeb.RoomLiveTest do
  use FlameTalkWeb.ConnCase

  import Phoenix.LiveViewTest
  import FlameTalk.AccountsFixtures

  describe "Room" do
    test "displays room name", %{conn: conn} do
      user = user_fixture()
      room_name = "Test Room"

      {:ok, _view, html} = conn
        |> log_in_user(user)
        |> live(~p"/rooms/#{room_name}")

      assert html =~ room_name
    end

    test "allows user to join the room", %{conn: conn} do
      user = user_fixture()
      room_name = "Test Room"

      {:ok, view, _html} = conn
        |> log_in_user(user)
        |> live(~p"/rooms/#{room_name}")

      assert render(view) =~ "Join Room"

      view
      |> element("button", "Join Room")
      |> render_click()

      assert render(view) =~ "Leave Room"
    end
  end
end
