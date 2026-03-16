import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models import quiz, user  # noqa: F401
from app.models.base import Base


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def engine():
    url = os.environ["TEST_DATABASE_URL"]
    eng = create_async_engine(url, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    async with engine.connect() as conn:
        await conn.begin()
        session_factory = async_sessionmaker(
            bind=conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        async with session_factory() as session:
            yield session
        await conn.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def allowed_alice(db_session: AsyncSession):
    from app.models.user import AllowedUsername

    entry = AllowedUsername(username="alice")
    db_session.add(entry)
    await db_session.flush()
    return entry


@pytest.fixture
async def alice(db_session: AsyncSession, allowed_alice):
    from app.models.user import User

    u = User(
        username="alice",
        password_hash=hash_password("password123"),
        display_name="Alice",
    )
    db_session.add(u)
    await db_session.flush()
    return u


@pytest.fixture
async def allowed_bob(db_session: AsyncSession):
    from app.models.user import AllowedUsername

    entry = AllowedUsername(username="bob")
    db_session.add(entry)
    await db_session.flush()
    return entry


@pytest.fixture
async def bob(db_session: AsyncSession, allowed_bob):
    from app.models.user import User

    u = User(
        username="bob",
        password_hash=hash_password("password123"),
        display_name="Bob",
    )
    db_session.add(u)
    await db_session.flush()
    return u


@pytest.fixture
def user_token(alice):
    return create_access_token({"sub": str(alice.id)})


@pytest.fixture
def bob_token(bob):
    return create_access_token({"sub": str(bob.id)})


@pytest.fixture
def admin_token():
    return create_access_token({"sub": "admin", "is_admin": True})
