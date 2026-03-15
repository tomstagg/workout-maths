# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`workout-maths` is a web application with:
- **Backend**: FastAPI (Python 3.12) + PostgreSQL via async SQLAlchemy
- **Frontend**: Next.js 15 (TypeScript, App Router, Tailwind)
- **Deployment**: Railway (backend and frontend as separate services, PostgreSQL as a Railway plugin)

## Guiding Principles

- **KISS** — Keep it simple. Prefer the straightforward solution over the clever one.
- **DRY** — Don't repeat yourself. Extract shared logic, but only once it's actually repeated.
- **YAGNI** — You aren't gonna need it. Don't add features, config, or abstractions speculatively.
- **SINE** — Simple is not easy. Simplicity requires deliberate effort; resist the pull toward complexity.

## Backend

Requires Python 3.12+ and [`uv`](https://docs.astral.sh/uv/getting-started/installation/).

### Setup

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY
uv sync --extra dev    # creates .venv and installs all deps
```

### Dev server

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000 — Interactive docs: http://localhost:8000/docs

### Migrations (Alembic)

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic current
```

> When adding new models, import them in `alembic/env.py` so autogenerate detects them.

### Tests (PyTest)

```bash
cd backend
uv run pytest                                          # all tests
uv run pytest tests/test_health.py                    # single file
uv run pytest tests/test_health.py::test_root         # single test
uv run pytest --cov=app --cov-report=term-missing     # with coverage
```

### Code Quality

```bash
cd backend
uv run ruff check app tests        # lint (E, F, I, N, W, UP rules)
uv run ruff format app tests       # auto-format (replaces black)
uv run mypy app                    # static type checking
```

Run all three before committing. `ruff format` is non-negotiable; mypy findings should be
investigated but won't always block.

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` |
| `TEST_DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/test_db` |
| `APP_ENV` | `development` / `production` |
| `SECRET_KEY` | Generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | Admin login password |
| `JWT_ALGORITHM` | JWT signing algorithm (default: `HS256`) |
| `JWT_EXPIRE_MINUTES` | Token lifetime in minutes (default: `10080`) |

## Frontend

Requires Node.js 20+.

### Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL
```

### Dev server

```bash
cd frontend
npm run dev   # http://localhost:3000
```

### Build & lint

```bash
cd frontend
npm run build
npm run start   # serve production build locally
npm run lint
```

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |

## Architecture

### Backend (`backend/`)

```
app/
├── main.py       # FastAPI app, router registration
├── config.py     # Pydantic Settings (validates env at startup)
├── database.py   # Async SQLAlchemy engine + get_db dependency
├── models/       # SQLAlchemy ORM models; import in alembic/env.py for autogenerate
├── routers/      # One file per resource; register in main.py
└── schemas/      # Pydantic request/response schemas
alembic/          # Async-configured migration env
tests/
├── conftest.py   # AsyncClient fixture via httpx + ASGITransport
└── test_*.py
```

- All DB access is async (`asyncpg` driver, `AsyncSession`)
- Routers use `Depends(get_db)` for session injection
- Config validated at startup — app crashes fast on missing env vars

### Frontend (`frontend/`)

```
src/app/          # Next.js App Router
├── layout.tsx    # Root layout
├── page.tsx      # Home page (/)
└── globals.css
```

- Server Components by default; add `"use client"` only when needed
- Call backend via `process.env.NEXT_PUBLIC_API_URL`

## Deployment (Railway)

Two Railway services + one PostgreSQL plugin in one Railway project:

| Service | Root directory | Key env vars |
|---|---|---|
| `backend` | `/backend` | `DATABASE_URL` (auto-linked), `SECRET_KEY`, `APP_ENV=production` |
| `frontend` | `/frontend` | `NEXT_PUBLIC_API_URL` → deployed backend URL |

Run migrations against production:
```bash
railway run --service backend uv run alembic upgrade head
```

## Local Development with Docker

```bash
docker compose up              # start all services (postgres, backend, frontend)
docker compose up -d postgres  # start only the database
docker compose exec backend uv run pytest   # run tests inside the running container
docker compose run --rm backend uv run pytest  # run tests as one-off
```

Backend: http://localhost:8000 · Frontend: http://localhost:3000

On first run, `init-test-db.sql` creates the `workout_maths_test` database automatically.
Migrations run automatically when the backend container starts.
