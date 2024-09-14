defmodule FlameTalk.AccountsTest do
  use FlameTalk.DataCase, async: true

  alias FlameTalk.Accounts

  describe "users" do
    @valid_attrs %{email: "user@example.com", password: "strong_password"}
    @invalid_attrs %{email: nil, password: nil}

    test "register_user/1 with valid data creates a user" do
      assert {:ok, user} = Accounts.register_user(@valid_attrs)
      assert user.email == "user@example.com"
      assert user.password == nil  # Password should not be present in the returned struct
      assert Bcrypt.verify_pass(@valid_attrs.password, user.hashed_password)
    end

    test "register_user/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Accounts.register_user(@invalid_attrs)
    end

    test "get_user!/1 returns the user with given id" do
      {:ok, user} = Accounts.register_user(@valid_attrs)
      fetched_user = Accounts.get_user!(user.id)
      assert fetched_user.email == user.email
      assert fetched_user.id == user.id
      assert fetched_user.password == nil  # Password should not be present
    end

    test "register_user/1 with duplicate email returns error changeset" do
      assert {:ok, _user} = Accounts.register_user(@valid_attrs)
      assert {:error, %Ecto.Changeset{}} = Accounts.register_user(@valid_attrs)
    end
  end
end
