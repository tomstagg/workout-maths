from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def test_leaderboard_empty(client: AsyncClient):
    response = await client.get("/leaderboard")
    assert response.status_code == 200
    assert response.json() == []


async def test_leaderboard_with_points(
    client: AsyncClient, alice, db_session: AsyncSession
):
    await db_session.execute(
        update(User).where(User.id == alice.id).values(total_points=100)
    )
    await db_session.flush()

    response = await client.get("/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["rank"] == 1
    assert data[0]["username"] == "alice"
    assert data[0]["total_points"] == 100


async def test_leaderboard_excludes_zero_points(
    client: AsyncClient, alice, db_session: AsyncSession
):
    # alice has default 0 points — should not appear
    response = await client.get("/leaderboard")
    assert response.status_code == 200
    assert response.json() == []


async def test_leaderboard_rank_field(
    client: AsyncClient, alice, bob, db_session: AsyncSession
):
    await db_session.execute(
        update(User).where(User.id == alice.id).values(total_points=200)
    )
    await db_session.execute(
        update(User).where(User.id == bob.id).values(total_points=100)
    )
    await db_session.flush()

    response = await client.get("/leaderboard")
    data = response.json()
    assert len(data) == 2
    assert data[0]["rank"] == 1
    assert data[0]["username"] == "alice"
    assert data[1]["rank"] == 2
    assert data[1]["username"] == "bob"
