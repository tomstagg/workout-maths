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

## Design Context

### Users
Primary users are children aged 6–10 using the app in a school classroom on shared devices, supervised by a teacher. Teachers are secondary users who manage student enrollment via an admin portal. Sessions are short and focused — a 10-question quiz completed in a few minutes. The interface must be immediately legible to early readers with limited keyboard/mouse precision.

### Brand Personality
**Friendly, Encouraging, Clear, Rewarding** — warm and calm with a slightly understated energy. The experience should feel like a game but never overwhelming. Vibrant wild animal characters/avatars are the aspirational mascot direction (think Duolingo's owl — a funny, characterful creature that reacts to the child's performance). Celebration moments should be joyful but not chaotic.

### Aesthetic Direction
- **Reference:** Duolingo — gamified streaks, big satisfying feedback moments, a mascot with personality, calm progression between excitement peaks.
- **Anti-reference:** Avoid frantic, overstimulating designs; avoid generic "educational software" beige/blue corporate look; avoid dark mode.
- **Theme:** Light only. Soft pastel gradient backgrounds (sky/emerald/violet). Rainbow accents used sparingly for celebration and branding — not as the default for every element.
- **Typography:** Fredoka (display/headings) + Nunito (body) — both friendly and legible for young readers.
- **Avatars:** Funny, expressive wild animal characters are the aspirational visual hook (not yet implemented — a future direction to design toward).

### Design Principles
1. **Calm is the baseline.** Keep the resting state clean and uncluttered. Reserve animation and colour intensity for feedback moments (correct answer, streak, perfect score).
2. **Encourage, never shame.** Wrong answers get gentle feedback; correct answers and streaks get celebration. No red-dominant error states that feel punishing.
3. **Legible at a glance.** Large touch targets, high-contrast text, clear visual hierarchy. A 6-year-old should never be confused about what to tap next.
4. **Earn the delight.** Confetti, fanfare, and sparkles should feel earned — triggered by genuine achievement (perfect score, long streak), not routine interactions.
5. **Consistent rainbow identity.** The 7-colour rainbow gradient (`--rainbow`) is the brand signature. Use it for the nav border, divider bars, and "Workout Maths" title. Don't dilute it by applying it everywhere.
