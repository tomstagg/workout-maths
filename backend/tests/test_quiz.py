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


def _make_mixed_answers(table: int, correct_mask: list[bool]) -> list[dict]:
    """Make exactly 10 answers where correct_mask[i] controls correctness."""
    now = datetime.now(UTC).isoformat()
    return [
        {
            "table_number": table,
            "multiplier": i + 1,
            "selected_answer": table * (i + 1) if correct else 0,
            "answered_at": now,
        }
        for i, correct in enumerate(correct_mask)
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


async def test_submit_valid_quiz_mixed(client: AsyncClient, alice, user_token: str):
    # Alternating correct/wrong — no streaks, just raw point counting
    mask = [True, False, True, False, True, False, True, False, True, False]
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 60.0,
            "answers": _make_mixed_answers(2, mask),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["correct_count"] == 5
    assert data["base_points"] == 5  # easy table, 5 correct × 1 pt
    assert data["streak_bonus_points"] == 0  # no consecutive runs ≥ 3


async def test_streak_bonus_3(client: AsyncClient, alice, user_token: str):
    # 3 correct then 7 wrong → fires 3-streak bonus only
    mask = [True] * 3 + [False] * 7
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 30.0,
            "answers": _make_mixed_answers(2, mask),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["streak_bonus_points"] == 5
    assert data["max_streak"] == 3


async def test_streak_bonus_5(client: AsyncClient, alice, user_token: str):
    # 5 correct then 5 wrong → fires 3-streak and 5-streak bonuses
    mask = [True] * 5 + [False] * 5
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 30.0,
            "answers": _make_mixed_answers(2, mask),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["streak_bonus_points"] == 15  # +5 (3-streak) + +10 (5-streak)
    assert data["max_streak"] == 5


async def test_streak_bonus_10(client: AsyncClient, alice, user_token: str):
    # All 10 correct → all streak bonuses fire
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 30.0,
            "answers": _make_answers(2, all_correct=True),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["streak_bonus_points"] == 40  # +5 + +10 + +25
    assert data["max_streak"] == 10


async def test_streak_resets_on_wrong(client: AsyncClient, alice, user_token: str):
    # correct×4, wrong×1, correct×3, wrong×2 → max_streak=4, no 5-streak bonus
    mask = [True] * 4 + [False] + [True] * 3 + [False] * 2
    now = datetime.now(UTC).isoformat()
    response = await client.post(
        "/quiz/sessions",
        json={
            "started_at": now,
            "duration_seconds": 30.0,
            "answers": _make_mixed_answers(2, mask),
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["max_streak"] == 4
    assert data["streak_bonus_points"] == 10  # 3-streak fires twice (4-run + 3-run)


async def test_points_accumulate_on_user(
    client: AsyncClient, alice, user_token: str, db_session: AsyncSession
):
    now = datetime.now(UTC).isoformat()
    for _ in range(2):
        await client.post(
            "/quiz/sessions",
            json={"started_at": now, "duration_seconds": 45.0, "answers": _make_answers(2)},
            headers={"Authorization": f"Bearer {user_token}"},
        )
    await db_session.refresh(alice)
    assert alice.total_points == 100  # 50 per quiz × 2


async def test_list_sessions_returns_own_only(
    client: AsyncClient, alice, user_token: str, bob, bob_token: str
):
    now = datetime.now(UTC).isoformat()
    # Alice submits a quiz
    await client.post(
        "/quiz/sessions",
        json={"started_at": now, "duration_seconds": 45.0, "answers": _make_answers(2)},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    # Bob should see 0 sessions
    response = await client.get(
        "/quiz/sessions", headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert response.status_code == 200
    assert response.json() == []
