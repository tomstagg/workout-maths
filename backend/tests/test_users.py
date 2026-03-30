from datetime import UTC, datetime

from httpx import AsyncClient


async def test_update_tables_valid(client: AsyncClient, alice, user_token: str):
    response = await client.put(
        "/users/me/tables",
        json={"table_numbers": [2, 5, 7]},
        cookies={"token": user_token},
    )
    assert response.status_code == 200
    assert response.json() == [2, 5, 7]


async def test_update_tables_rejects_out_of_range(
    client: AsyncClient, alice, user_token: str
):
    # Schema now rejects values outside 2-12 with a 422
    response = await client.put(
        "/users/me/tables",
        json={"table_numbers": [1, 5, 7, 13]},
        cookies={"token": user_token},
    )
    assert response.status_code == 422


async def test_update_tables_replaces_previous(
    client: AsyncClient, alice, user_token: str
):
    await client.put(
        "/users/me/tables",
        json={"table_numbers": [2, 5]},
        cookies={"token": user_token},
    )
    response = await client.put(
        "/users/me/tables",
        json={"table_numbers": [7, 9]},
        cookies={"token": user_token},
    )
    assert response.status_code == 200
    assert response.json() == [7, 9]


async def test_get_stats_empty(client: AsyncClient, alice, user_token: str):
    response = await client.get(
        "/users/me/stats", cookies={"token": user_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_points"] == 0
    assert data["quiz_count"] == 0
    assert data["selected_tables"] == []


async def test_get_stats(client: AsyncClient, alice, user_token: str):
    await client.put(
        "/users/me/tables",
        json={"table_numbers": [2, 5]},
        cookies={"token": user_token},
    )

    response = await client.get(
        "/users/me/stats", cookies={"token": user_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_points"] == 0
    assert data["quiz_count"] == 0
    assert data["selected_tables"] == [2, 5]


async def test_get_stats_after_quiz(client: AsyncClient, alice, user_token: str):
    now = datetime.now(UTC).isoformat()
    answers = [
        {
            "table_number": 2,
            "multiplier": i,
            "selected_answer": 2 * i,  # all correct
            "answered_at": now,
        }
        for i in range(1, 11)
    ]
    await client.post(
        "/quiz/sessions",
        json={"started_at": now, "duration_seconds": 45.0, "answers": answers},
        cookies={"token": user_token},
    )

    response = await client.get(
        "/users/me/stats", cookies={"token": user_token}
    )
    data = response.json()
    assert data["quiz_count"] == 1
    assert data["total_points"] == 50  # easy table, all correct, base 10 + streak 40
