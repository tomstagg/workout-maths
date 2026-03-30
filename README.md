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

| Variable | Where | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | backend | yes | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | backend | yes | Generate: `openssl rand -hex 32` — must be ≥32 chars |
| `ADMIN_USERNAME` | backend | no | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | backend | **yes** | Admin login password — no default, app fails to start if unset |
| `CORS_ALLOWED_ORIGINS` | backend | no | Comma-separated allowed frontend origins (default: `http://localhost:3000`) |
| `APP_ENV` | backend | no | `development` / `production` — controls cookie security flags and SQL logging |
| `JWT_ALGORITHM` | backend | no | Default: `HS256` |
| `JWT_EXPIRE_MINUTES` | backend | no | Default: `10080` (7 days) |
| `NEXT_PUBLIC_API_URL` | frontend | yes | Backend base URL |

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
| FastAPI app | `backend/app/main.py` | Creates `app`, registers CORS + rate limiter, mounts all routers |
| Next.js root | `frontend/src/app/layout.tsx` | Root HTML shell, Geist fonts |
| Home redirect | `frontend/src/app/page.tsx` | Redirects `/` → `/login` |
| Route guard (server) | `frontend/src/middleware.ts` | Edge middleware — checks cookie presence before page renders; redirects to `/login` or `/admin/login` |
| Route guard (client) | `frontend/src/app/(app)/layout.tsx` | Calls `GET /auth/me`; redirects if 401 |
| Docker | `docker-compose.yml` | Orchestrates postgres, backend, frontend |

---

## Core modules

### Backend

```
backend/app/
├── main.py          # FastAPI instance, CORS (origin-restricted), slowapi rate limiter, router mounts
├── config.py        # Pydantic Settings — validates all env vars at startup, crashes fast
├── database.py      # Async SQLAlchemy engine (echo disabled in production), get_db()
├── auth.py          # bcrypt hashing, JWT encode/decode, get_current_user() (cookie), get_current_admin() (cookie)
├── limiter.py       # slowapi Limiter instance (shared across routers)
├── models/
│   ├── base.py      # SQLAlchemy declarative Base
│   ├── user.py      # AllowedUsername, User, UserTablePreference
│   └── quiz.py      # QuizSession, QuizAnswer
├── schemas/
│   ├── auth.py      # SignupRequest (with validators), LoginRequest, UserProfile
│   ├── quiz.py      # AnswerSubmit, QuizSubmitRequest, QuizSessionResponse, LeaderboardEntry
│   └── admin.py     # AdminLoginRequest, AllowedUsernameCreate/Response
└── routers/
    ├── health.py    # GET /health — DB ping
    ├── auth.py      # POST /auth/signup, /auth/login, /auth/logout · GET /auth/me
    ├── admin.py     # POST /admin/login, /admin/logout · CRUD /admin/usernames
    ├── users.py     # GET/PUT /users/me/tables · GET /users/me/stats
    ├── quiz.py      # POST /quiz/sessions · GET /quiz/sessions
    └── leaderboard.py  # GET /leaderboard
```

### Frontend

```
frontend/src/
├── middleware.ts                # Edge route guard — checks httpOnly cookies, redirects if absent
├── app/
│   ├── layout.tsx               # Root layout (Geist fonts, metadata)
│   ├── page.tsx                 # / → redirect to /login
│   ├── (auth)/
│   │   ├── login/page.tsx       # Child login form
│   │   └── signup/page.tsx      # Signup (username must be pre-approved)
│   ├── (app)/
│   │   ├── layout.tsx           # Calls GET /auth/me to verify session; nav bar + logout
│   │   ├── profile/page.tsx     # Table selector, stats, leaderboard
│   │   ├── quiz/page.tsx        # 10-question timed quiz
│   │   └── quiz/results/page.tsx  # Score + answer review
│   └── admin/
│       ├── login/page.tsx       # Admin login
│       └── page.tsx             # Manage allowed usernames
└── lib/
    ├── api.ts     # Typed fetch wrapper (base URL, credentials: "include", error throw)
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
Signup:  POST /auth/signup  (rate-limited: 5/min)
         → validate username in AllowedUsername table
         → hash password (bcrypt)
         → create User row
         → set httpOnly cookie "token" on response (SameSite=Lax dev / None+Secure prod)

Login:   POST /auth/login  (rate-limited: 10/min)
         → fetch User by username
         → verify_password()
         → set httpOnly cookie "token" on response

Logout:  POST /auth/logout
         → clears "token" cookie

Every protected request:
         Browser sends "token" cookie automatically (credentials: "include")
         → get_current_user() reads cookie, decodes JWT, loads User from DB
```

### Admin flow

```
POST /admin/login  (rate-limited: 5/min)
     → compare against ADMIN_USERNAME / ADMIN_PASSWORD env vars
     → set httpOnly cookie "admin_token" on response

POST /admin/logout
     → clears "admin_token" cookie

All /admin/* routes:
     → get_current_admin() reads "admin_token" cookie, checks is_admin flag
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
│  │  middleware.ts ─ edge cookie check │  │
│  │  lib/api.ts ──── fetch + cookies ────┼──► FastAPI :8000
│  │  lib/quiz.ts ─── pure logic       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FastAPI :8000                          │
│  SQLAlchemy (async) + asyncpg           │
│  PyJWT · passlib[bcrypt] · slowapi      │
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
- JWTs are stored in httpOnly cookies (not accessible to JavaScript)
- Question generation is entirely client-side (`lib/quiz.ts`); server only validates and scores submitted answers

---

## Control flow — request lifecycle

```
HTTP request
  │
  ├─ main.py              CORSMiddleware (origin-restricted, env-configured)
  │                       slowapi rate limiter (429 on breach)
  │                       Route dispatch
  │
  ├─ router/*.py          Pydantic validates request body (with field validators)
  │                       Depends(get_db) → opens AsyncSession
  │                       Depends(get_current_user) → reads cookie, decodes JWT, loads User
  │
  ├─ models/*.py          SQLAlchemy ORM queries (async, asyncpg driver)
  │
  └─ Response             Pydantic serialises output schema → JSON
                          Set-Cookie on login/signup/admin-login
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
| `backend` | `/backend` | `DATABASE_URL` (auto-linked), `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_ENV=production`, `CORS_ALLOWED_ORIGINS` → frontend URL |
| `frontend` | `/frontend` | `NEXT_PUBLIC_API_URL` → deployed backend URL |

Run migrations against production:
```bash
railway run --service backend uv run alembic upgrade head
```
