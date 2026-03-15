from datetime import UTC, datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


def _make_answers(table: int, all_correct: bool = True) -> list[dict]:
    now = datetime.now(UTC).isoformat()
    return [
        {
            "table_number": table,
            "multiplier": i,
            "selected_answer": table * i if all_correct else 0,
            "answered_at": now,
        }
        for i in range(1, 11)
    ]


async def test_submit_all_correct_easy(client: AsyncClient, alice, user_token: str):
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 45.0,
            "answers": _make_answers(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["correct_count"] == 10
    assert data["base_points"] == 10
    assert data["streak_bonus_points"] == 40
    assert data["total_points_earned"] == 50


async def test_submit_wrong_answer_count(client: AsyncClient, alice, user_token: str):
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 45.0,
            "answers": _make_answers(2)[:9],
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 400


async def test_submit_all_correct_hard(client: AsyncClient, alice, user_token: str):
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 60.0,
            "answers": _make_answers(7),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["base_points"] == 30
    assert data["streak_bonus_points"] == 40
    assert data["total_points_earned"] == 70


async def test_list_sessions_after_submit(client: AsyncClient, alice, user_token: str):
    now = datetime.now(UTC).isoformat()
    await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 45.0,
            "answers": _make_answers(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )

    response = await client.get(
        "/quiz/sessions", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_total_points_incremented(
    client: AsyncClient, alice, user_token: str, db_session: AsyncSession
):
    now = datetime.now(UTC).isoformat()
    await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 45.0,
            "answers": _make_answers(2),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )

    await db_session.refresh(alice)
    assert alice.total_points == 50
