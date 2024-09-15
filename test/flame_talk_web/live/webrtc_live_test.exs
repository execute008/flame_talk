defmodule FlameTalkWeb.WebRTCLiveTest do
  use FlameTalkWeb.ConnCase

  import Phoenix.LiveViewTest
  import FlameTalk.AccountsFixtures

  describe "Room" do
    test "joining and leaving the room", %{conn: conn} do
      user1 = user_fixture()
      user2 = user_fixture()
      room_name = "Test Room"

      # First user joins the room
      {:ok, view1, html1} = conn
        |> log_in_user(user1)
        |> live(~p"/rooms/#{room_name}")

      # Extract the user_id from the rendered HTML
      user1_id = extract_user_id(html1)

      # Initially, no users should be listed
      refute render(view1) =~ "Users in Room:"

      # Join the room
      view1
      |> element("button", "Join Room")
      |> render_click()

      # After joining, the user list should be visible with the first user
      assert render(view1) =~ "Users in Room:"
      assert render(view1) =~ user1_id

      # Second user joins the room
      {:ok, view2, html2} = conn
        |> log_in_user(user2)
        |> live(~p"/rooms/#{room_name}")

      user2_id = extract_user_id(html2)

      view2
      |> element("button", "Join Room")
      |> render_click()

      # Both views should now show both users
      assert render(view1) =~ user2_id
      assert render(view2) =~ user1_id

      # First user leaves the room
      view1
      |> element("button", "Leave Room")
      |> render_click()

      # Second user's view should update to show only themselves
      refute render(view2) =~ user1_id
      assert render(view2) =~ user2_id
    end

    test "initializes WebRTC connection", %{conn: conn} do
      user = user_fixture()
      room_name = "Test Room"

      {:ok, view, _html} = conn
        |> log_in_user(user)
        |> live(~p"/rooms/#{room_name}")

      # Join the room first
      view
      |> element("button", "Join Room")
      |> render_click()

      # Check for some indication that WebRTC has been initialized
      assert render(view) =~ "video-container"
    end
  end

  defp extract_user_id(html) do
    ~r/data-user-id="([^"]+)"/
    |> Regex.run(html)
    |> List.last()
  end
end
