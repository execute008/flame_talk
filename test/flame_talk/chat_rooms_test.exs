defmodule FlameTalk.ChatRoomsTest do
  use FlameTalk.DataCase, async: true

  alias FlameTalk.ChatRooms
  alias FlameTalk.ChatRooms.Room
  alias FlameTalk.Accounts

  describe "rooms" do
    @valid_attrs %{name: "Test Room"}
    @invalid_attrs %{name: nil}

    def room_fixture(attrs \\ %{}) do
      {:ok, user} = Accounts.register_user(%{email: "test@example.com", password: "password123"})

      {:ok, room} =
        attrs
        |> Enum.into(@valid_attrs)
        |> Map.put(:creator_id, user.id)
        |> ChatRooms.create_room()

      room
    end

    test "list_rooms/0 returns all rooms" do
      room = room_fixture()
      assert ChatRooms.list_rooms() == [room]
    end

    test "get_room!/1 returns the room with given id" do
      room = room_fixture()
      assert ChatRooms.get_room!(room.id) == room
    end

    test "create_room/1 with valid data creates a room" do
      {:ok, user} = Accounts.register_user(%{email: "creator@example.com", password: "password123"})
      valid_attrs = Map.put(@valid_attrs, :creator_id, user.id)

      assert {:ok, %Room{} = room} = ChatRooms.create_room(valid_attrs)
      assert room.name == "Test Room"
    end

    test "create_room/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = ChatRooms.create_room(@invalid_attrs)
    end

    test "join_room/2 adds a user to a room" do
      room = room_fixture()
      {:ok, user} = Accounts.register_user(%{email: "joiner@example.com", password: "password123"})

      assert {:ok, _} = ChatRooms.join_room(room.id, user.id)
      assert Enum.any?(ChatRooms.list_participants(room.id), fn participant -> participant.id == user.id end)
    end
  end
end
