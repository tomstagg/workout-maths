from httpx import AsyncClient


async def test_admin_login_valid(client: AsyncClient):
    response = await client.post(
        "/admin/login",
        json={
            "username": "admin",
            "password": "changeme",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_admin_login_wrong_password(client: AsyncClient):
    response = await client.post(
        "/admin/login",
        json={
            "username": "admin",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


async def test_list_usernames_empty(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/admin/usernames", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_add_username(client: AsyncClient, admin_token: str):
    response = await client.post(
        "/admin/usernames",
        json={"username": "newuser"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201

    list_response = await client.get(
        "/admin/usernames", headers={"Authorization": f"Bearer {admin_token}"}
    )
    usernames = [u["username"] for u in list_response.json()]
    assert "newuser" in usernames


async def test_add_username_duplicate(
    client: AsyncClient, admin_token: str, allowed_alice
):
    response = await client.post(
        "/admin/usernames",
        json={"username": "alice"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 409


async def test_delete_username(client: AsyncClient, admin_token: str, allowed_alice):
    response = await client.delete(
        "/admin/usernames/alice",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204


async def test_delete_username_not_found(client: AsyncClient, admin_token: str):
    response = await client.delete(
        "/admin/usernames/nobody",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
