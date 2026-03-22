# workout-maths

![CI](https://github.com/tomstagg/workout-maths/actions/workflows/ci.yml/badge.svg)

Times-tables practice web app for children aged 6–10. Kids are pre-registered by an admin, sign up with a password, pick which tables to practise, take timed 10-question multiple-choice quizzes, and earn points with streak bonuses.

**Stack**: FastAPI (Python 3.12) + PostgreSQL · Next.js 15 (TypeScript, App Router, Tailwind) · Deployed on Railway.

---

## Run it locally

### Option A — Docker (recommended, zero setup)

```bash
docker compose up
```

- Backend: http://localhost:8000 · Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Migrations run automatically on backend start.

### Option B — Native

**Prerequisites**: Python 3.12+, [`uv`](https://docs.astral.sh/uv/getting-started/installation/), Node.js 20+, PostgreSQL running locally.

**Backend**
```bash
cd backend
cp .env.example .env          # fill DATABASE_URL, SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)
```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | backend | Generate: `openssl rand -hex 32` |
| `ADMIN_USERNAME` | backend | Admin login (default: `admin`) |
| `ADMIN_PASSWORD` | backend | Admin login password |
| `APP_ENV` | backend | `development` / `production` |
| `JWT_ALGORITHM` | backend | Default: `HS256` |
| `JWT_EXPIRE_MINUTES` | backend | Default: `10080` (7 days) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL |

### Tests

```bash
# Backend — requires postgres (docker compose up -d postgres)
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://workout:workout@localhost:5432/workout_maths_test uv run pytest
uv run pytest --cov=app --cov-report=term-missing   # coverage

# Frontend — no backend needed
cd frontend
npm test
```

---

## Entry points

| Entry point | File | What it does |
|---|---|---|
| FastAPI app | `backend/app/main.py` | Creates `app`, registers CORS, mounts all routers |
| Next.js root | `frontend/src/app/layout.tsx` | Root HTML shell, Geist fonts |
| Home redirect | `frontend/src/app/page.tsx` | Redirects `/` → `/login` |
| App auth guard | `frontend/src/app/(app)/layout.tsx` | Checks `localStorage` JWT; redirects to `/login` if missing |
| Docker | `docker-compose.yml` | Orchestrates postgres, backend, frontend |

---

## Core modules

### Backend

```
backend/app/
├── main.py          # FastAPI instance, CORS, router mounts
├── config.py        # Pydantic Settings — validates all env vars at startup, crashes fast
├── database.py      # Async SQLAlchemy engine, AsyncSessionLocal, get_db() dependency
├── auth.py          # bcrypt hashing, JWT encode/decode, get_current_user(), get_current_admin()
├── models/
│   ├── base.py      # SQLAlchemy declarative Base
│   ├── user.py      # AllowedUsername, User, UserTablePreference
│   └── quiz.py      # QuizSession, QuizAnswer
├── schemas/
│   ├── auth.py      # SignupRequest, LoginRequest, TokenResponse, UserProfile
│   ├── quiz.py      # AnswerSubmit, QuizSubmitRequest, QuizSessionResponse, LeaderboardEntry
│   └── admin.py     # AdminLoginRequest, AllowedUsernameCreate/Response
└── routers/
    ├── health.py    # GET /health — DB ping
    ├── auth.py      # POST /auth/signup, /auth/login · GET /auth/me
    ├── admin.py     # POST /admin/login · CRUD /admin/usernames
    ├── users.py     # GET/PUT /users/me/tables · GET /users/me/stats
    ├── quiz.py      # POST /quiz/sessions · GET /quiz/sessions
    └── leaderboard.py  # GET /leaderboard
```

### Frontend

```
frontend/src/
├── app/
│   ├── layout.tsx               # Root layout (Geist fonts, metadata)
│   ├── page.tsx                 # / → redirect to /login
│   ├── (auth)/
│   │   ├── login/page.tsx       # Child login form
│   │   └── signup/page.tsx      # Signup (username must be pre-approved)
│   ├── (app)/
│   │   ├── layout.tsx           # JWT guard + nav bar
│   │   ├── profile/page.tsx     # Table selector, stats, leaderboard
│   │   ├── quiz/page.tsx        # 10-question timed quiz
│   │   └── quiz/results/page.tsx  # Score + answer review
│   └── admin/
│       ├── login/page.tsx       # Admin login
│       └── page.tsx             # Manage allowed usernames
└── lib/
    ├── api.ts     # Typed fetch wrapper (base URL, auth header, error throw)
    ├── auth.ts    # Token read/write/clear (localStorage), isLoggedIn()
    └── quiz.ts    # generateQuestions(), getStreakBadge(), STREAK_THRESHOLDS
```

---

## Data flow

### Quiz flow (the happy path)

```
1. /profile          → GET /users/me/stats          → shows selected tables
2. Toggle table      → PUT /users/me/tables          → persists selection
3. Start quiz        → GET /auth/me (selected tables)
                     → generateQuestions() [client-side, lib/quiz.ts]
                     → renders 10 questions locally (no API call per question)
4. Answer question   → instant visual feedback, streak tracked client-side
5. After Q10         → POST /quiz/sessions { answers, duration }
                     → server scores everything (see scoring rules below)
                     → server updates user.total_points
                     → returns QuizSessionResponse with session ID
6. /quiz/results     → GET /quiz/sessions → find by ID → render breakdown
```

### Auth flow

```
Signup:  POST /auth/signup
         → validate username in AllowedUsername table
         → hash password (bcrypt)
         → create User row
         → return JWT

Login:   POST /auth/login
         → fetch User by username
         → verify_password()
         → return JWT

Every protected request:
         Authorization: Bearer <token>
         → HTTPBearer extracts token
         → get_current_user() decodes JWT, loads User from DB
```

### Admin flow

```
POST /admin/login
     → compare plain-text against ADMIN_USERNAME / ADMIN_PASSWORD env vars
     → return JWT with is_admin=true claim

All /admin/* routes:
     → get_current_admin() decodes JWT, checks is_admin flag
     → manage AllowedUsername rows (add / list / delete)
```

---

## Scoring rules (server-enforced)

Points per correct answer by table difficulty:

| Tier | Tables | Points |
|---|---|---|
| Easy | 2, 5, 10 | 1 pt |
| Medium | 3, 4, 6, 8, 9 | 2 pts |
| Hard | 7, 11, 12 | 3 pts |

Streak bonuses (consecutive correct answers, cumulative per quiz):

| Streak | Bonus | Badge |
|---|---|---|
| 3 in a row | +5 pts | 🔥 |
| 5 in a row | +10 pts | 🔥🔥 |
| 10 in a row (perfect) | +25 pts | 🔥🔥🔥 |

The client never sends a score — only raw answers. The server computes everything.

---

## Dependencies & boundaries

```
┌─────────────────────────────────────────┐
│  Browser                                │
│  ┌───────────────────────────────────┐  │
│  │  Next.js 15 (App Router)          │  │
│  │  React 19 · Tailwind 4            │  │
│  │  lib/api.ts ──── fetch ──────────────┼──► FastAPI :8000
│  │  lib/auth.ts ─── localStorage     │  │
│  │  lib/quiz.ts ─── pure logic       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FastAPI :8000                          │
│  SQLAlchemy (async) + asyncpg           │
│  PyJWT · passlib[bcrypt]                │
│  Pydantic Settings + pydantic v2        │
│            │                            │
│            ▼                            │
│  PostgreSQL :5432                       │
│  Tables: allowed_usernames, users,      │
│          user_table_preferences,        │
│          quiz_sessions, quiz_answers    │
└─────────────────────────────────────────┘
```

**Boundaries**:
- Frontend never touches the DB directly — everything via REST API
- Admin auth is env-var credentials (no DB row) with a separate JWT claim (`is_admin=true`)
- Child auth is DB-backed JWT (7-day expiry)
- JWT stored in `localStorage` (not httpOnly cookies)
- Question generation is entirely client-side (`lib/quiz.ts`); server only validates and scores submitted answers

---

## Control flow — request lifecycle

```
HTTP request
  │
  ├─ main.py              CORSMiddleware (all origins in dev)
  │                       Route dispatch
  │
  ├─ router/*.py          Pydantic validates request body
  │                       Depends(get_db) → opens AsyncSession
  │                       Depends(get_current_user) → decodes JWT, loads User
  │
  ├─ models/*.py          SQLAlchemy ORM queries (async, asyncpg driver)
  │
  └─ Response             Pydantic serialises output schema → JSON
```

---

## Database schema

| Table | Key columns | Notes |
|---|---|---|
| `allowed_usernames` | `id`, `username` | Admin-managed signup allow-list |
| `users` | `id`, `username`, `password_hash`, `total_points` | Child accounts |
| `user_table_preferences` | `user_id`, `table_number` | Which tables (2–12) selected; unique per user+table |
| `quiz_sessions` | `user_id`, `correct_count`, `base_points`, `streak_bonus_points`, `max_streak` | One row per completed quiz |
| `quiz_answers` | `session_id`, `position`, `table_number`, `multiplier`, `selected_answer`, `is_correct` | One row per question |

Migrations managed by Alembic (`backend/alembic/`). Models imported in `alembic/env.py` for autogenerate.

---

## Deployment (Railway)

Two Railway services + one PostgreSQL plugin:

| Service | Root dir | Key env vars |
|---|---|---|
| `backend` | `/backend` | `DATABASE_URL` (auto-linked), `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_ENV=production` |
| `frontend` | `/frontend` | `NEXT_PUBLIC_API_URL` → deployed backend URL |

Run migrations against production:
```bash
railway run --service backend uv run alembic upgrade head
```
