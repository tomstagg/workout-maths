from httpx import AsyncClient


async def test_signup_approved(client: AsyncClient, allowed_alice):
    response = await client.post(
        "/auth/signup",
        json={
            "username": "alice",
            "password": "password123",
            "display_name": "Alice",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_signup_unapproved(client: AsyncClient):
    response = await client.post(
        "/auth/signup",
        json={
            "username": "bob",
            "password": "pass123",
        },
    )
    assert response.status_code == 400


async def test_signup_duplicate(client: AsyncClient, alice):
    response = await client.post(
        "/auth/signup",
        json={
            "username": "alice",
            "password": "newpassword",
        },
    )
    assert response.status_code == 400


async def test_login_valid(client: AsyncClient, alice):
    response = await client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_login_wrong_password(client: AsyncClient, alice):
    response = await client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


async def test_me_with_token(client: AsyncClient, alice, user_token: str):
    response = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert data["display_name"] == "Alice"


async def test_me_no_token(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401
