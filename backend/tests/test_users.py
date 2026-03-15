from httpx import AsyncClient


async def test_update_tables_valid(client: AsyncClient, alice, user_token: str):
    response = await client.put(
        "/users/me/tables",
        json={"table_numbers": [2, 5, 7]},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json() == [2, 5, 7]


async def test_update_tables_filters_out_of_range(
    client: AsyncClient, alice, user_token: str
):
    response = await client.put(
        "/users/me/tables",
        json={"table_numbers": [1, 5, 7, 13]},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json() == [5, 7]


async def test_get_stats(client: AsyncClient, alice, user_token: str):
    await client.put(
        "/users/me/tables",
        json={"table_numbers": [2, 5]},
        headers={"Authorization": f"Bearer {user_token}"},
    )

    response = await client.get(
        "/users/me/stats", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_points"] == 0
    assert data["quiz_count"] == 0
    assert data["selected_tables"] == [2, 5]
