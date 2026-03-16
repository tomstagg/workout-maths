# workout-maths

A times-tables practice web app for children aged 6–10. Kids are pre-registered by an admin, sign up with a password, pick which tables to practise, take timed 10-question multiple-choice quizzes, and earn points with streak bonuses. The goal is an encouraging, rewarding experience that makes children want to keep practising.

**Stack**: FastAPI (Python 3.12) + PostgreSQL · Next.js 15 (TypeScript, App Router, Tailwind) · Deployed on Railway.

---

## How it works

### For children
1. An admin pre-approves their username
2. They sign up with a password at `/signup`
3. On their profile they select which times tables to practise (2–12)
4. They start a quiz: 10 random multiple-choice questions drawn from their selected tables
5. A client-side timer counts up as they answer; streak bonuses fire at 3, 5, and 10 consecutive correct answers
6. After Q10, answers are submitted to the server which scores everything and awards points
7. A results screen shows score, time, points earned, and a streak badge
8. Points accumulate on a leaderboard visible to all users

### For admins
- Log in at `/admin/login` with env-configured credentials
- Add and remove pre-approved usernames from an allow-list
- Only pre-approved usernames can complete signup

---

## Points system

| Tier | Tables | Points per correct answer |
|------|--------|--------------------------|
| Easy | 2, 5, 10 | 1 pt |
| Medium | 3, 4, 6, 8, 9 | 2 pts |
| Hard | 7, 11, 12 | 3 pts |

**In-quiz streak bonuses** (consecutive correct answers within one session):

| Streak | Bonus | Badge |
|--------|-------|-------|
| 3 in a row | +5 pts | 🔥 |
| 5 in a row | +10 pts | 🔥🔥 |
| 10 in a row (perfect) | +25 pts | 🔥🔥🔥 |

Streak bonuses are cumulative — a perfect quiz earns all three.

---

## Architecture

### Backend (`backend/`)

FastAPI application with async PostgreSQL access via SQLAlchemy + asyncpg.

```
app/
├── main.py              # FastAPI app, CORS middleware, router registration
├── config.py            # Pydantic Settings — validates env vars at startup
├── database.py          # Async engine + get_db dependency
├── auth.py              # JWT creation/verification, password hashing (bcrypt)
├── models/
│   ├── user.py          # AllowedUsername, User, UserTablePreference
│   └── quiz.py          # QuizSession, QuizAnswer
├── schemas/
│   ├── auth.py          # SignupRequest, LoginRequest, TokenResponse, UserProfile
│   ├── quiz.py          # QuizSubmitRequest, QuizSessionResponse, LeaderboardEntry
│   └── admin.py         # AllowedUsernameCreate, AllowedUsernameResponse
└── routers/
    ├── health.py        # GET /health
    ├── auth.py          # POST /auth/signup, /auth/login, GET /auth/me
    ├── admin.py         # POST /admin/login, CRUD /admin/usernames
    ├── users.py         # GET/PUT /users/me/tables, GET /users/me/stats
    ├── quiz.py          # POST /quiz/sessions, GET /quiz/sessions
    └── leaderboard.py   # GET /leaderboard
```

**Key design decisions:**
- All DB access is async (`asyncpg` driver, `AsyncSession`)
- Routers use `Depends(get_db)` for session injection
- Server scores every quiz submission — the client never sends a score, only raw answers
- Admin auth uses a single hardcoded account via env vars; child auth uses JWT (7-day expiry, signed with `SECRET_KEY`)
- JWT stored in `localStorage`

### Frontend (`frontend/`)

Next.js 15 App Router application. Server Components by default; `"use client"` only where needed.

```
src/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page (/)
│   ├── (auth)/
│   │   ├── login/page.tsx       # Child login form
│   │   └── signup/page.tsx      # Signup (username must be pre-approved)
│   ├── (app)/
│   │   ├── layout.tsx           # JWT guard — redirects to /login if no token
│   │   ├── profile/page.tsx     # Table selector, personal stats, leaderboard
│   │   ├── quiz/page.tsx        # 10-question timed quiz
│   │   └── quiz/results/page.tsx  # Score summary
│   └── admin/
│       ├── login/page.tsx       # Admin login
│       └── page.tsx             # Manage allowed usernames
└── lib/
    ├── api.ts     # Typed fetch wrapper (NEXT_PUBLIC_API_URL + auth header)
    ├── auth.ts    # Token read/write (localStorage), decoded user info
    └── quiz.ts    # Client-side question generation + distractor generation
```

**Quiz flow:**
1. Fetch user's selected tables from API on mount
2. Generate 10 questions client-side — random `{table, multiplier}` pairs distributed across selected tables
3. Each question has 5 answer choices: the correct answer + 4 distractors (nearby multiples, neighbouring table results)
4. User answers; running streak tracked client-side with live badge display
5. After Q10, POST all raw answers + elapsed time to `/quiz/sessions`
6. Server validates, scores, awards points, and returns full result
7. Redirect to `/quiz/results`

### Database schema

| Table | Purpose |
|-------|---------|
| `allowed_usernames` | Admin-managed list of permitted usernames |
| `users` | Child accounts (username, bcrypt hash, display name, total points) |
| `user_table_preferences` | Which tables (2–12) each user has selected |
| `quiz_sessions` | One row per completed quiz (score, duration, points, max streak) |
| `quiz_answers` | One row per question per quiz (table, multiplier, selected answer, correctness) |

---

## Local development

### Backend

Requires Python 3.12+ and [`uv`](https://docs.astral.sh/uv/getting-started/installation/).

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000 — Docs: http://localhost:8000/docs

### Frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                 # http://localhost:3000
```

### Tests

**Backend** — 47 tests covering all routers + pure scoring logic. Requires a running PostgreSQL instance (use `docker compose up -d postgres`).

```bash
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://workout:workout@localhost:5432/workout_maths_test uv run pytest
uv run pytest --cov=app --cov-report=term-missing   # coverage ≥ 84%
```

| Area | Tests | What's covered |
|------|-------|----------------|
| Scoring (unit) | 9 | Points per table tier, streak bonus thresholds, streak reset behaviour, mixed-difficulty quizzes |
| Auth | 7 | Signup (approved/unapproved/duplicate), login, wrong password, `/auth/me` auth'd and unauth'd |
| Admin | 8 | Admin login, username CRUD (add/duplicate/delete/list), user token rejected on admin routes |
| Users | 6 | Table selection (valid/out-of-range/replaces), stats (empty, with tables, after quiz) |
| Quiz | 12 | All-correct (easy/hard), wrong answer count, mixed scoring, streak bonuses (3/5/10), streak resets, point accumulation, session isolation between users |
| Leaderboard | 4 | Empty, zero-points excluded, ordering, rank field |
| Health | 1 | `GET /` returns 200 |

**Frontend** — 19 tests covering pure logic in `lib/`. No backend required.

```bash
cd frontend
npm test
```

| Area | Tests | What's covered |
|------|-------|----------------|
| Quiz logic | 12 | `generateQuestions` returns 10 questions, correct answer = table × multiplier, 5 unique positive options, empty input; `getStreakBadge` for each threshold (null/3/5/10/above-max) |
| Auth utils | 7 | `setToken`/`getToken`/`clearToken` localStorage round-trip, `isLoggedIn` true/false/after-clear |

---

## Deployment (Railway)

Two Railway services + one PostgreSQL plugin in one Railway project:

| Service | Root directory | Key env vars |
|---------|----------------|--------------|
| `backend` | `/backend` | `DATABASE_URL` (auto-linked), `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_ENV=production` |
| `frontend` | `/frontend` | `NEXT_PUBLIC_API_URL` → deployed backend URL |

Run migrations against production:

```bash
railway run --service backend uv run alembic upgrade head
```
