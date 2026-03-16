# Times Tables App — Implementation Plan

## Overview

A children's times-tables practice web app. Children are pre-registered by an admin (allowed usernames list), sign up with a password, pick which tables to practise, take timed 10-question multiple-choice quizzes, and earn points + streak bonuses. The goal is an encouraging, rewarding experience that makes children want to practise.

**Stack**: FastAPI (Python 3.12) + PostgreSQL + Next.js 15 (TypeScript, App Router), deployed on Railway.

---

## Decisions

- **Quiz**: Can mix multiple tables in one session; 10 random questions; client-side timer (count-up)
- **Streaks**: Within-quiz only; bonus tiers based on difficulty of tables in quiz
- **Admin auth**: Single hardcoded admin via env vars (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- **JWT**: Stored in `localStorage`; 7-day expiry; signed with existing `SECRET_KEY`

---

## Points System

| Tier | Tables | Points per correct answer |
|------|--------|--------------------------|
| Easy | 2, 5, 10 | 1 pt |
| Medium | 3, 4, 6, 8, 9 | 2 pts |
| Hard | 7, 11, 12 | 3 pts |

**In-quiz streak bonuses** (consecutive correct answers within one session):

| Streak | Bonus | Badge |
|--------|-------|-------|
| 3 in a row | +5 pts | 🔥 Soft streak |
| 5 in a row | +10 pts | 🔥🔥 Medium streak |
| 10 in a row (perfect) | +25 pts | 🔥🔥🔥 Hard streak |

Streak bonuses are cumulative (a 10-streak earns all three bonuses). The badge tier displayed depends on which difficulty tables were included.

---

## Database Schema

### `allowed_usernames`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| username | VARCHAR UNIQUE | Admin-added |
| created_at | TIMESTAMP | |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| username | VARCHAR UNIQUE | Must exist in `allowed_usernames` |
| password_hash | VARCHAR | bcrypt |
| display_name | VARCHAR | Defaults to username |
| total_points | INTEGER | Running total, updated after each quiz |
| created_at | TIMESTAMP | |

### `user_table_preferences`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| table_number | SMALLINT | 2–12 |
| UNIQUE(user_id, table_number) | | |

### `quiz_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| table_numbers | INTEGER[] | Tables included in this quiz |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| total_questions | SMALLINT | Always 10 |
| correct_count | SMALLINT | |
| duration_seconds | FLOAT | Client-measured |
| base_points | INTEGER | Sum of per-answer points |
| streak_bonus_points | INTEGER | Sum of streak bonuses |
| total_points_earned | INTEGER | base + streak |
| max_streak | SMALLINT | Longest consecutive run in this quiz |

### `quiz_answers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_id | UUID FK → quiz_sessions | |
| position | SMALLINT | 0–9 |
| table_number | SMALLINT | e.g. 5 (for 5× table) |
| multiplier | SMALLINT | 1–12 |
| correct_answer | SMALLINT | |
| selected_answer | SMALLINT | |
| is_correct | BOOLEAN | |
| answered_at | TIMESTAMP | |

---

## Backend

### New dependencies
```toml
"PyJWT>=2.8",
"passlib[bcrypt]>=1.7",
"bcrypt>=4.0",
```

### New environment variables
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080   # 7 days
# SECRET_KEY already exists, reused for JWT signing
```

### New files

```
backend/app/
  auth.py                  # JWT + password hashing utilities
  models/
    user.py                # AllowedUsername, User, UserTablePreference
    quiz.py                # QuizSession, QuizAnswer
  schemas/
    auth.py                # SignupRequest, LoginRequest, TokenResponse, UserProfile
    quiz.py                # QuizSubmitRequest, QuizSessionResponse, LeaderboardEntry
    admin.py               # AllowedUsernameCreate, AllowedUsernameResponse
  routers/
    auth.py                # /auth/signup, /auth/login, /auth/me
    admin.py               # /admin/login, /admin/usernames CRUD
    users.py               # /users/me/tables, /users/me/stats
    quiz.py                # POST /quiz/sessions, GET /quiz/sessions
    leaderboard.py         # GET /leaderboard
```

`app/main.py` — register all new routers + CORS middleware
`alembic/env.py` — import `user.py` and `quiz.py` models

### Key backend logic

**`app/auth.py`**
- `hash_password(plain)` / `verify_password(plain, hashed)` — passlib bcrypt
- `create_access_token(data: dict)` — PyJWT, signed with `SECRET_KEY`
- `get_current_user(token)` — FastAPI dependency, raises 401 if invalid
- `get_current_admin(token)` — checks `is_admin: true` claim in token

**`POST /auth/signup`**
1. Check `username` exists in `allowed_usernames`
2. Check `username` not already in `users`
3. Create user with hashed password
4. Return JWT

**`POST /quiz/sessions`** (server validates everything)
1. Receive list of `{table_number, multiplier, selected_answer, answered_at}`
2. Compute `correct_answer = table_number × multiplier` for each
3. Calculate base points (per-answer difficulty) and streak bonuses
4. Insert `QuizSession` + `QuizAnswer` rows
5. Increment `users.total_points`
6. Return full scored result

---

## Frontend

### Pages

```
src/app/
  (auth)/
    login/page.tsx           # Child login form
    signup/page.tsx          # Username + password (username must be pre-approved)
  (app)/
    layout.tsx               # JWT-guarded — redirects to /login if no token
    profile/page.tsx         # Table selector, personal stats, leaderboard
    quiz/page.tsx            # The 10-question quiz
    quiz/results/page.tsx    # Score summary screen
  admin/
    login/page.tsx           # Admin login
    page.tsx                 # Manage allowed usernames list
```

### Components

```
src/components/
  quiz/
    QuestionCard.tsx         # Big question (e.g. "5 × 7 = ?") + 5 answer buttons
    AnswerHistory.tsx        # Stack of previous Q&As, pushed upward, grayed out
    TimerBar.tsx             # Elapsed time counter
    ResultsCard.tsx          # Score, time, points, streak badge, message
  profile/
    TableSelector.tsx        # 2–12 grid checkboxes
    StatsCard.tsx            # Total points, quiz count
  leaderboard/
    LeaderboardRow.tsx
  ui/
    StreakBadge.tsx           # 🔥 / 🔥🔥 / 🔥🔥🔥 with label
```

### Lib utilities

```
src/lib/
  api.ts       # Typed fetch wrapper using NEXT_PUBLIC_API_URL + auth header
  auth.ts      # Token read/write (localStorage), decoded user info
  quiz.ts      # Client-side: question generation + distractor generation
```

### `lib/quiz.ts` — Question & distractor generation

Given `selectedTables: number[]`:
1. Generate 10 `{table, multiplier}` pairs — random, distributed evenly across selected tables
2. Per question, `correctAnswer = table × multiplier`
3. Generate 4 distractors: nearby multiples of the same table (±1, ±2 multipliers), neighbouring table results, ±small offsets. Deduplicate, keep positive, randomise order.
4. Final options: 5 shuffled choices

### Quiz page flow

1. On mount: fetch user's selected tables from API
2. Generate 10 questions client-side
3. Display: `QuestionCard` (current Q) + `AnswerHistory` (previous Qs, scroll up as answered)
4. On button click: record answer, compute running streak, show 🔥 badge if threshold hit, advance
5. After Q10: POST all answers + elapsed time to `/quiz/sessions`
6. Redirect to `/quiz/results?session={id}`

### Results page messages

| Score | Message |
|-------|---------|
| 10/10 | "PERFECT! You're a times tables superstar! ⭐" |
| 8–9 | "Amazing work! So close to perfect! 🎉" |
| 5–7 | "Great effort! Keep practising! 💪" |
| < 5 | "Nice try! Every attempt makes you better! 🌟" |

---

## Execution Order

1. Add `PyJWT`, `passlib[bcrypt]`, `bcrypt` to `backend/pyproject.toml`; run `uv sync --extra dev`
2. Create `app/models/user.py` and `app/models/quiz.py`; update `alembic/env.py` imports
3. Generate and apply migration: `alembic revision --autogenerate` → `alembic upgrade head`
4. Create `app/auth.py`
5. Create schemas: `app/schemas/auth.py`, `quiz.py`, `admin.py`
6. Create routers: auth → admin → users → quiz → leaderboard; register in `main.py`, add CORS
7. Create `frontend/src/lib/api.ts`, `auth.ts`, `quiz.ts`
8. Create frontend pages: login → signup → admin → profile → quiz → results

---

## Verification

```bash
# Backend
cd backend && uv run pytest

# Manual end-to-end:
# 1. Admin logs in at /admin/login → adds username "alice"
# 2. Signup at /signup as alice with a password
# 3. Login at /login → redirected to /profile
# 4. Select 2× and 5× tables on profile
# 5. Start quiz → answer all 10 → see results page
# 6. Check points on profile match results page
# 7. Check /leaderboard shows alice
```

---

## Technical Backlog

Each task is self-contained enough for an independent agent to pick up in a git worktree, implement, test locally, and open a PR. Tasks are ordered: foundations first, enhancements last.

> **UI polish**: UI improvement tasks use [Impeccable](https://impeccable.so) and are interspersed throughout the backlog as the app takes shape. These are marked with the `ui/` branch prefix.

---

### TASK-001 · Initial commit & branch hygiene
**Branch**: `chore/initial-commit`
**Status**: Done

**Description**
Everything is currently untracked on the `framework` branch. This task commits all existing code, sets up `.gitignore`, and ensures `main` reflects the working baseline.

**Scope**
- Verify `backend/.gitignore` excludes `.venv/`, `__pycache__/`, `*.pyc`, `.env`
- Verify `frontend/.gitignore` excludes `node_modules/`, `.next/`, `.env.local`
- Root `.gitignore` exists (already present)
- Stage and commit all source files (exclude `.venv/`, `node_modules/`)
- Confirm `main` branch is up to date

**Test locally**
```bash
git status          # should show only tracked files
git log --oneline   # should show a meaningful first commit message
```

**PR criteria**
- `git status` in CI shows a clean working tree after `uv sync` and `npm install`
- No `.venv/`, `node_modules/`, or `.env` files committed

---

### TASK-002 · Backend integration test suite
**Branch**: `test/backend-integration`
**Status**: Not started
**Depends on**: TASK-001

**Description**
`tests/` currently has only `test_health.py` with no database isolation. Write a full integration test suite covering all routers. Tests must run against a real PostgreSQL database (the `table_numbers INTEGER[]` column is PostgreSQL-specific — SQLite is not viable).

**Scope**
- `backend/tests/conftest.py` — overhaul to:
  - Accept a `TEST_DATABASE_URL` env var (separate test DB, e.g. `postgresql+asyncpg://user:pass@localhost:5432/workout_maths_test`)
  - Create all tables before the test session using `async_engine.begin()` + `Base.metadata.create_all`
  - Drop all tables after the test session
  - Override `get_db` FastAPI dependency to use a transactional session that rolls back after each test (use `AsyncSession` with `begin_nested()` or per-test table truncation)
  - Expose `client`, `admin_token`, and `user_token` fixtures
- `backend/tests/test_auth.py`
  - `test_signup_success` — allowed username → 201, returns JWT
  - `test_signup_not_allowed` — unapproved username → 400
  - `test_signup_duplicate` — second signup same username → 400
  - `test_login_success` — correct credentials → 200, JWT
  - `test_login_wrong_password` → 401
  - `test_me_returns_profile` — authenticated → 200, correct fields
  - `test_me_unauthenticated` → 401
- `backend/tests/test_admin.py`
  - `test_admin_login_success` → 200, JWT with `is_admin: true`
  - `test_admin_login_wrong_credentials` → 401
  - `test_add_username` — admin token → 201
  - `test_add_duplicate_username` → 409
  - `test_list_usernames` — returns added entries
  - `test_delete_username` → 204
  - `test_delete_nonexistent_username` → 404
  - `test_admin_endpoints_reject_user_token` — non-admin JWT → 403
- `backend/tests/test_users.py`
  - `test_update_tables_valid` — [2, 5, 7] → 200, sorted list returned
  - `test_update_tables_invalid_range` — [1, 13] filtered out → returns `[]`
  - `test_update_tables_replaces_previous` — second call overwrites first
  - `test_get_stats_empty` — new user → 0 points, 0 quizzes, `[]` tables
  - `test_get_stats_after_quiz` — reflects correct totals
- `backend/tests/test_quiz.py`
  - `test_submit_valid_quiz_all_correct` — 10 correct answers, hard tables → correct base + streak bonus
  - `test_submit_valid_quiz_mixed` — partial correct → correct_count and base points match
  - `test_submit_wrong_answer_count` — 9 answers → 400
  - `test_streak_bonus_3` — 3 consecutive correct → +5 bonus
  - `test_streak_bonus_5` — 5 consecutive → +5+10 cumulative
  - `test_streak_bonus_10` — 10 consecutive → +5+10+25 cumulative
  - `test_streak_resets_on_wrong` — correct×4, wrong, correct×3 → max_streak=4, no 5-streak bonus
  - `test_points_accumulate_on_user` — two quizzes → total_points is sum of both
  - `test_list_sessions_returns_own_only` — user A cannot see user B's sessions
- `backend/tests/test_leaderboard.py`
  - `test_leaderboard_empty` → `[]`
  - `test_leaderboard_ordering` — higher-point user ranks above lower
  - `test_leaderboard_excludes_zero_points` — user with no quizzes not shown
  - `test_leaderboard_rank_field` — rank=1 is highest, sequential

**Test locally**
```bash
cd backend
# Create a test DB first:
createdb workout_maths_test
TEST_DATABASE_URL=postgresql+asyncpg://localhost/workout_maths_test uv run pytest tests/ -v
```

**Backend scoring unit tests** (pure, no DB)
Also add `backend/tests/test_scoring.py` testing `compute_scoring` from `app/routers/quiz.py` directly:
- All correct, easy table → base = 10, streak bonus = 40 (5+10+25), max_streak = 10
- All wrong → base = 0, bonus = 0, max_streak = 0
- Alternating correct/wrong → no streak bonuses, max_streak = 1
- Mixed table difficulties → correct per-table point allocation

**PR criteria**
- `uv run pytest tests/ -v` passes with a test PostgreSQL DB
- Coverage ≥ 80% on `app/routers/` and `app/auth.py` (`uv run pytest --cov=app --cov-report=term-missing`)
- No test mutates another test's state (each test is isolated)

---

### TASK-UI-01 · Initial UI polish pass
**Branch**: `ui/initial-polish`
**Status**: In progress
**Depends on**: TASK-002

**Description**
First impeccable pass over the existing frontend. The app is functionally complete but unstyled beyond defaults. This task brings it up to a production-quality baseline before unit tests are written against the components.

**Scope**
Run the relevant impeccable skills against the current frontend pages and components:
- `/impeccable:critique` — assess current design quality and identify priority areas
- `/impeccable:frontend-design` — redesign or polish key pages (login, signup, profile, quiz, results, admin)
- `/impeccable:polish` — alignment, spacing, and consistency pass
- `/impeccable:colorize` — add strategic colour (streak badges, score states, difficulty tiers)

**PR criteria**
- All existing pages render without layout breakage
- `npm run build` and `npm run lint` pass
- Mobile-friendly (no horizontal scroll on 375px viewport)

---

### TASK-003 · Frontend unit tests
**Branch**: `test/frontend-unit`
**Status**: Not started
**Depends on**: TASK-001

**Description**
Add a Vitest + React Testing Library test suite for frontend logic and key UI components.

**Scope**
Install dev dependencies:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add `vitest.config.ts` at `frontend/`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: true },
  resolve: { alias: { '@': '/src' } }
})
```

Add `frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Add `"test": "vitest run"` and `"test:watch": "vitest"` to `frontend/package.json` scripts.

- `frontend/src/lib/__tests__/quiz.test.ts`
  - `generateQuestions` returns exactly 10 questions for valid input
  - `generateQuestions` returns `[]` for empty table list
  - Each question's `correctAnswer === table × multiplier`
  - Each question has exactly 5 `options` (1 correct + 4 distractors)
  - `correctAnswer` is always present in `options`
  - No duplicate values in `options`
  - All `options` are positive integers
  - `getStreakBadge(2)` → null
  - `getStreakBadge(3)` → `{ streak: 3, emoji: '🔥' }`
  - `getStreakBadge(5)` → medium tier
  - `getStreakBadge(10)` → hard tier
  - `getStreakBadge(15)` → still returns hard tier (highest match)

- `frontend/src/lib/__tests__/auth.test.ts`
  - `setToken` writes to `localStorage`
  - `getToken` reads back correctly
  - `clearToken` removes it
  - `isLoggedIn` returns true/false appropriately

**Test locally**
```bash
cd frontend
npm test
```

**PR criteria**
- `npm test` exits 0
- All quiz logic tests pass
- No tests reference `process.env.NEXT_PUBLIC_API_URL` (mock `api.ts` instead)

---

### TASK-004 · GitHub Actions CI pipeline
**Branch**: `ci/github-actions`
**Status**: Not started
**Depends on**: TASK-002, TASK-003

**Description**
Set up CI that runs backend and frontend tests on every push and PR to `main`.

**Scope**
Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: workout_maths_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/workout_maths_test
      TEST_DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/workout_maths_test
      SECRET_KEY: ci-secret-key-not-real
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: testpassword
      APP_ENV: test
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          version: 'latest'
      - run: uv sync --extra dev
      - run: uv run pytest tests/ -v --cov=app --cov-report=term-missing

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
```

**Test locally**
```bash
# Simulate backend CI locally:
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://localhost/workout_maths_test uv run pytest tests/ -v

# Simulate frontend CI locally:
cd frontend
npm test && npm run lint && npm run build
```

**PR criteria**
- Both jobs pass on the PR itself (CI must be green before merge)
- Badge added to `README.md`: `![CI](https://github.com/<org>/workout-maths/actions/workflows/ci.yml/badge.svg)`

---

### TASK-005 · Railway deployment
**Branch**: `chore/railway-deploy`
**Status**: Not started
**Depends on**: TASK-004

**Description**
Configure both services for Railway deployment and document the one-time setup steps.

**Scope**
- `backend/Procfile` (Railway uses this for the start command if no Dockerfile):
  ```
  web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- `backend/railway.json`:
  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": { "builder": "NIXPACKS" },
    "deploy": {
      "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 30,
      "restartPolicyType": "ON_FAILURE"
    }
  }
  ```
- `frontend/railway.json`:
  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": { "builder": "NIXPACKS" },
    "deploy": {
      "startCommand": "npm run start",
      "healthcheckPath": "/",
      "healthcheckTimeout": 30
    }
  }
  ```
- Ensure `backend/app/routers/health.py` returns `{"status": "ok"}` at `GET /health` (Railway healthcheck)
- Update `CLAUDE.md` and `README.md` with the exact Railway env vars required per service

**Environment variables to configure in Railway dashboard**

Backend service:
```
DATABASE_URL          → auto-linked from Railway PostgreSQL plugin
SECRET_KEY            → openssl rand -hex 32
ADMIN_USERNAME        → your chosen admin username
ADMIN_PASSWORD        → secure password
APP_ENV               → production
```

Frontend service:
```
NEXT_PUBLIC_API_URL   → https://<backend-railway-domain>
```

**Run migration on first deploy**
```bash
railway run --service backend uv run alembic upgrade head
```

**Test locally**
```bash
# Confirm healthcheck endpoint exists:
cd backend && uv run uvicorn app.main:app --port 8000
curl http://localhost:8000/health   # → {"status":"ok"}
```

**PR criteria**
- Both `railway.json` files committed
- `/health` endpoint returns 200 with `{"status": "ok"}`
- README updated with correct Railway env var table and migration command

---

### TASK-006 · Tighten CORS for production
**Branch**: `chore/cors-hardening`
**Status**: Not started
**Depends on**: TASK-005

**Description**
`main.py` currently allows all origins (`"*"`). In production this should be restricted to the frontend Railway domain.

**Scope**
- `backend/app/config.py` — add `allowed_origins: list[str] = ["*"]` setting, populated from `ALLOWED_ORIGINS` env var (comma-separated)
- `backend/app/main.py` — pass `settings.allowed_origins` to `CORSMiddleware`
- Railway backend service env var: `ALLOWED_ORIGINS=https://<frontend-domain>`
- Development `.env.example` keeps `ALLOWED_ORIGINS=*`
- Add test `test_cors_preflight` to `tests/test_health.py` verifying the `Access-Control-Allow-Origin` header

**Test locally**
```bash
cd backend
ALLOWED_ORIGINS=http://localhost:3000 uv run uvicorn app.main:app --port 8000
curl -H "Origin: http://localhost:3000" -I http://localhost:8000/health   # should return CORS header
curl -H "Origin: http://evil.com" -I http://localhost:8000/health         # should not return CORS header
```

**PR criteria**
- `ALLOWED_ORIGINS` env var controls CORS; production Railway value is the frontend URL
- `.env.example` updated with the new variable
- CORS test passes

---

### TASK-007 · End-to-end smoke tests (Playwright)
**Branch**: `test/e2e-playwright`
**Status**: Not started
**Depends on**: TASK-004, TASK-005

**Description**
Playwright smoke tests covering the critical user journey: login → profile → quiz → results. These run against a locally running full stack (backend + frontend + local postgres).

**Scope**
```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

Add `frontend/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

Create `frontend/e2e/auth.spec.ts`:
- Navigate to `/login`, attempt wrong password → error message visible
- Navigate to `/signup` → fill pre-approved username + password → redirect to `/profile`
- After signup, `/profile` shows the username

Create `frontend/e2e/quiz.spec.ts`:
- Log in, go to profile, select table 2, click "Start Quiz!"
- Confirm quiz page loads with a question
- Click any answer → progress dot turns green or red
- After 10 answers → redirect to `/quiz/results`
- Results page shows score and points

Add `"test:e2e": "playwright test"` to `frontend/package.json`.

**Test locally**
```bash
# Terminal 1: start backend
cd backend && uv run uvicorn app.main:app --port 8000

# Terminal 2: start frontend
cd frontend && npm run dev

# Terminal 3: run e2e
cd frontend && npm run test:e2e
```

**PR criteria**
- All Playwright tests pass locally
- A CI job `e2e` added to `.github/workflows/ci.yml` that starts both services and runs the suite (can be marked `continue-on-error: true` initially)

---

### TASK-008 · Confetti on perfect score
**Branch**: `feat/confetti-perfect-score`
**Status**: Not started
**Depends on**: TASK-001

**Description**
When a child scores 10/10, trigger a full-screen confetti explosion on the results page. Use `canvas-confetti` (lightweight, no React dependency).

**Scope**
```bash
cd frontend && npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- `frontend/src/app/(app)/quiz/results/page.tsx` — in `ResultsContent`, after session loads, if `session.correct_count === 10`, call `confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } })` inside a `useEffect`
- The confetti import must be dynamic (`import('canvas-confetti')`) to avoid SSR issues
- No confetti for scores < 10

**Test locally**
1. Start both services, log in, select a table
2. Answer all 10 questions correctly → results page should fire confetti
3. Answer some wrong → no confetti

**Tests to write**
In `frontend/src/lib/__tests__/quiz.test.ts`, confirm `getScoreMessage(10).message` contains "PERFECT" (already testable without DOM).

**PR criteria**
- `canvas-confetti` added to `package.json`
- Confetti fires only on 10/10, not on other scores
- `npm run build` passes (dynamic import required)

---

### TASK-009 · Sound effects
**Branch**: `feat/sound-effects`
**Status**: Not started
**Depends on**: TASK-001

**Description**
Add audio feedback: a cheerful ding on correct answers, a soft thud on wrong answers, and a short fanfare when the results page loads (triggered by a non-perfect score too — just smaller).

**Scope**
- Add sound files to `frontend/public/sounds/`: `correct.mp3`, `wrong.mp3`, `fanfare.mp3` (use royalty-free CC0 sources, e.g. freesound.org — document the source in a comment)
- Create `frontend/src/lib/sound.ts`:
  ```ts
  export function playSound(name: 'correct' | 'wrong' | 'fanfare') {
    const audio = new Audio(`/sounds/${name}.mp3`)
    audio.volume = 0.5
    audio.play().catch(() => {}) // ignore autoplay block
  }
  ```
- `frontend/src/app/(app)/quiz/page.tsx` — call `playSound('correct')` / `playSound('wrong')` inside `handleAnswer` after determining `isRight`
- `frontend/src/app/(app)/quiz/results/page.tsx` — call `playSound('fanfare')` in the `useEffect` after session loads (after the confetti call if perfect score)
- Sounds must be wrapped in try/catch or `.catch(() => {})` — browsers block autoplay without prior user interaction; the quiz always has user interaction before sound is needed

**Test locally**
1. Open quiz, answer correctly → hear ding
2. Answer wrong → hear thud
3. Reach results page → hear fanfare

**PR criteria**
- Three sound files present in `public/sounds/`
- `playSound` helper guards against autoplay errors
- `npm run build` passes

---

### TASK-010 · Avatar picker
**Branch**: `feat/avatar-picker`
**Status**: Not started
**Depends on**: TASK-001, TASK-004

**Description**
Allow children to pick a cartoon avatar on their profile. The selection is stored in the database.

**Backend scope**
- `backend/app/models/user.py` — add `avatar: str | None` column (nullable VARCHAR, default `None`)
- Generate and run Alembic migration:
  ```bash
  cd backend
  uv run alembic revision --autogenerate -m "add avatar column to users"
  uv run alembic upgrade head
  ```
- `backend/app/schemas/auth.py` — add `avatar: str | None` to `UserProfile`
- `backend/app/routers/auth.py` — include `avatar` in `/auth/me` response
- `backend/app/routers/users.py` — add `PUT /users/me/avatar` endpoint:
  - Body: `{ "avatar": "robot" }`
  - Validates avatar name is in the allowed set (see below)
  - Updates `users.avatar`, returns updated `UserProfile`

**Allowed avatar names** (define as a constant in the router):
```python
VALID_AVATARS = {"cat", "dog", "robot", "wizard", "astronaut", "dinosaur", "fox", "unicorn"}
```

**Frontend scope**
- Create `frontend/src/components/AvatarPicker.tsx` — a grid of 8 clickable avatar options, each rendered as a large emoji with a label:
  ```
  cat🐱  dog🐶  robot🤖  wizard🧙  astronaut👨‍🚀  dinosaur🦕  fox🦊  unicorn🦄
  ```
  Selected avatar gets a highlighted border. On click, calls `PUT /users/me/avatar`.
- `frontend/src/app/(app)/profile/page.tsx` — add `AvatarPicker` above the table selector; show the current avatar as a large emoji in the welcome banner alongside the display name

**Tests to write**
Backend (`backend/tests/test_users.py`):
- `test_update_avatar_valid` → 200, avatar persisted on subsequent `/auth/me`
- `test_update_avatar_invalid` → 400 ("Invalid avatar")

Frontend (`frontend/src/components/__tests__/AvatarPicker.test.tsx`):
- Renders 8 avatar options
- Clicking an avatar calls the API mock

**PR criteria**
- Migration runs cleanly: `alembic upgrade head` then `alembic downgrade -1` then `alembic upgrade head`
- Avatar appears in profile UI
- Backend tests pass; `npm test` passes

---

### TASK-011 · Achievement badges
**Branch**: `feat/achievement-badges`
**Status**: Not started
**Depends on**: TASK-001, TASK-004

**Description**
Award badges for milestones and display them on the profile page. Badges are computed server-side from existing data — no new DB table needed in v1.

**Badges to implement**
| Badge | ID | Criteria |
|-------|-----|----------|
| First Quiz! | `first_quiz` | quiz_count ≥ 1 |
| 10 Quizzes | `ten_quizzes` | quiz_count ≥ 10 |
| 100 Points Club | `hundred_points` | total_points ≥ 100 |
| 500 Points Club | `five_hundred_points` | total_points ≥ 500 |
| Times Tables Master | `master` | quiz_count ≥ 50 AND total_points ≥ 500 |
| Perfect Score | `perfect_score` | any quiz session with correct_count = 10 |
| Speed Demon | `speed_demon` | any quiz completed in < 60 seconds with correct_count ≥ 8 |

**Backend scope**
- `backend/app/schemas/auth.py` — add `badges: list[str]` to `UserProfile`
- `backend/app/routers/auth.py` — compute badges in `/auth/me` from user stats + a query for perfect/speed sessions; include in response
- Create `backend/app/badges.py` — pure function `compute_badges(total_points, quiz_count, has_perfect, has_speed_demon) -> list[str]`; this keeps badge logic testable without DB

**Frontend scope**
- Create `frontend/src/components/BadgeShelf.tsx` — displays earned badges as coloured pill chips with emoji, greyed-out for unearned (show all possible badges with lock icon if not earned)
- `frontend/src/app/(app)/profile/page.tsx` — add `BadgeShelf` below the table selector

**Tests to write**
Backend (`backend/tests/test_badges.py` — pure unit tests, no DB):
- `test_no_badges_new_user` → `[]`
- `test_first_quiz_badge` → earned after quiz_count=1
- `test_hundred_points` → earned at total_points=100, not at 99
- `test_master_requires_both` → not earned with only quiz_count=50 or only points=500

**PR criteria**
- `compute_badges` is a pure function, fully unit-tested
- Badges appear on profile with correct earn/lock state
- `/auth/me` includes `badges` field

---

### TASK-012 · Cross-session login streaks & daily challenge
**Branch**: `feat/login-streaks`
**Status**: Not started
**Depends on**: TASK-011

**Description**
Track how many consecutive days a child has logged in and taken at least one quiz. Display a flame counter on the profile page and login page.

**Backend scope**
- `backend/app/models/user.py` — add columns:
  - `current_streak: int` (default 0)
  - `longest_streak: int` (default 0)
  - `last_quiz_date: date | None` (nullable)
- Generate and run Alembic migration
- `backend/app/routers/quiz.py` — after a quiz is submitted, update streak:
  - If `last_quiz_date == today`: no change (already quizzed today)
  - If `last_quiz_date == yesterday`: `current_streak += 1`, update `last_quiz_date = today`
  - If `last_quiz_date` is older or None: `current_streak = 1`, `last_quiz_date = today`
  - Always: `longest_streak = max(longest_streak, current_streak)`
- `backend/app/schemas/auth.py` — add `current_streak`, `longest_streak` to `UserProfile`

**Frontend scope**
- `frontend/src/app/(app)/profile/page.tsx` — display a flame counter `🔥 {current_streak} day streak!` in the welcome banner if `current_streak > 0`; show "longest streak: {longest_streak} days" as a sub-stat

**Tests to write** (`backend/tests/test_quiz.py`):
- `test_streak_starts_at_1_on_first_quiz`
- `test_streak_increments_next_day`
- `test_streak_does_not_increment_same_day`
- `test_streak_resets_after_gap`
- `test_longest_streak_preserved_after_reset`

**PR criteria**
- Migration clean (up and down)
- Streak displayed on profile
- All streak tests pass

---

### TASK-013 · Enhanced leaderboard views
**Branch**: `feat/leaderboard-views`
**Status**: Not started
**Depends on**: TASK-001

**Description**
Add multiple leaderboard tabs: All-time (existing), This week, Most active (quiz count), and Personal bests.

**Backend scope**
- `backend/app/routers/leaderboard.py` — add query param `?view=alltime|weekly|active`:
  - `alltime`: current behaviour (order by `total_points` desc)
  - `weekly`: sum `total_points_earned` from `quiz_sessions` where `completed_at >= start of current week (Monday 00:00 UTC)`, order by that sum desc
  - `active`: order by `quiz_count` desc (most quizzes completed)
- Add `GET /leaderboard/me/personal-bests` endpoint returning:
  - `fastest_quiz`: min `duration_seconds` across all completed sessions (correct_count ≥ 8)
  - `highest_score`: max `correct_count` in a single session
  - `best_streak`: max `max_streak` in a single session

**Frontend scope**
- `frontend/src/app/(app)/profile/page.tsx` — replace the single leaderboard list with tabbed views (All-time / This week / Most active); fetch the appropriate `?view=` param on tab change
- Add a "Personal Bests" card above the leaderboard showing the three stats from `/leaderboard/me/personal-bests`

**Tests to write** (`backend/tests/test_leaderboard.py`):
- `test_weekly_view_excludes_old_quizzes`
- `test_weekly_view_includes_this_weeks_quizzes`
- `test_active_view_ordered_by_quiz_count`
- `test_personal_bests_empty_for_new_user`
- `test_personal_bests_correct_values`

**PR criteria**
- Three leaderboard tabs work, switching fetches correct data
- Personal bests card shows real values
- All tests pass

---

### TASK-014 · Practice mode
**Branch**: `feat/practice-mode`
**Status**: Not started
**Depends on**: TASK-001

**Description**
A no-pressure mode with no timer, hints available (tap to reveal correct answer without penalty), and a gentler scoring scheme. Does not affect the main leaderboard.

**Backend scope**
- `backend/app/routers/quiz.py` — add optional `?mode=practice` query param to `GET /quiz/sessions` (list only non-practice) and `POST /quiz/sessions`:
  - Accept optional `"mode": "practice"` in `QuizSubmitRequest`
  - Store `is_practice: bool` on `QuizSession` (add column via migration, default `false`)
  - Practice sessions award 0 points and do not update `users.total_points`
  - Practice sessions are excluded from the leaderboard calculation

**Frontend scope**
- `frontend/src/app/(app)/profile/page.tsx` — add a secondary "Practice Mode" button below "Start Quiz!" (different colour — soft blue)
- `frontend/src/app/(app)/quiz/page.tsx` — accept `?mode=practice` URL param:
  - Hide the timer
  - Add a "Show Answer" button (reveals correct answer in green, marks question as hinted)
  - Display "Practice Mode 🎓" badge at the top
  - On submission, set `mode: "practice"` in the POST body
- `frontend/src/app/(app)/quiz/results/page.tsx` — for practice sessions, show "Practice Complete! Great work learning! 📚" instead of the score hero gradient; do not show points breakdown

**Tests to write** (`backend/tests/test_quiz.py`):
- `test_practice_session_awards_no_points`
- `test_practice_session_not_in_leaderboard`
- `test_normal_session_still_awards_points`

**PR criteria**
- Practice sessions isolated from points/leaderboard
- Migration clean
- Frontend clearly differentiates practice from scored quiz

---

### TASK-015 · Weak-spots analysis
**Branch**: `feat/weak-spots`
**Status**: Not started
**Depends on**: TASK-013

**Description**
After several quizzes, surface a "You find 7× and 8× hardest" insight on the profile page, with a button to start a targeted quick quiz on those tables.

**Backend scope**
- Add `GET /users/me/weak-spots` endpoint:
  - Joins `quiz_answers` for the current user over the last 30 days
  - Groups by `table_number`, computes `wrong_rate = wrong_count / total_count`
  - Returns tables with `wrong_rate > 0.4` AND `total_count >= 5`, ordered by `wrong_rate` desc, limited to 3
  - Returns `[]` if not enough data
- Response schema: `list[{ table_number: int, wrong_rate: float, total_attempts: int }]`

**Frontend scope**
- `frontend/src/app/(app)/profile/page.tsx` — fetch `/users/me/weak-spots`; if non-empty, show a card: "You find ×7 and ×8 hardest! Want to practise those? 🎯" with a "Quick Practise!" button that navigates to `/quiz` with `?tables=7,8` pre-selected
- `frontend/src/app/(app)/quiz/page.tsx` — read `?tables=` query param on mount; if present, use those tables instead of fetching from profile preferences

**Tests to write** (`backend/tests/test_users.py`):
- `test_weak_spots_insufficient_data` → returns `[]` with < 5 attempts per table
- `test_weak_spots_identifies_hard_table`
- `test_weak_spots_excludes_well_mastered_tables`

**PR criteria**
- Weak-spots card appears on profile only when data is sufficient
- Quick Practise button pre-selects the weak tables
- All tests pass

---

### TASK-016 · Points shop & cosmetic unlocks
**Branch**: `feat/points-shop`
**Status**: Not started
**Depends on**: TASK-010 (avatar), TASK-011 (badges)

**Description**
Let children spend accumulated points on cosmetic items: profile border colours and background themes for the quiz page.

**Backend scope**
- New model `backend/app/models/shop.py`:
  ```python
  class ShopItem(Base):
      id: str (PK, e.g. "border_gold")
      name: str
      category: str  # "border" | "theme"
      cost: int
      description: str

  class UserUnlock(Base):
      id: UUID PK
      user_id: UUID FK → users
      item_id: str FK → shop_items
      unlocked_at: TIMESTAMP
  ```
- Seed shop items in a migration (or a startup function) — suggested items:
  | id | name | category | cost |
  |----|------|----------|------|
  | `border_gold` | Gold Border | border | 50 |
  | `border_rainbow` | Rainbow Border | border | 150 |
  | `theme_space` | Space Theme | theme | 100 |
  | `theme_underwater` | Underwater Theme | theme | 200 |
  | `theme_jungle` | Jungle Theme | theme | 150 |
- `backend/app/routers/shop.py`:
  - `GET /shop` — list all items with `{ ..., unlocked: bool }` for authenticated user
  - `POST /shop/purchase/{item_id}` — deduct cost from `users.total_points`, create `UserUnlock`; 400 if insufficient points, 409 if already owned
- Register router in `main.py`

**Frontend scope**
- New page `frontend/src/app/(app)/shop/page.tsx` — grid of shop items, each shows name, cost, a preview swatch, and "Buy" or "Owned" state
- `frontend/src/app/(app)/layout.tsx` — add "Shop 🛍️" link to the nav
- Apply purchased `border` to profile welcome banner; apply purchased `theme` as a CSS class on the quiz page background (define theme CSS vars in `globals.css`)

**Tests to write** (`backend/tests/test_shop.py`):
- `test_purchase_success` — points deducted, item appears in unlocks
- `test_purchase_insufficient_points` → 400
- `test_purchase_duplicate` → 409
- `test_list_shop_shows_unlock_status`

**PR criteria**
- Points are atomically deducted (no race condition — use `UPDATE users SET total_points = total_points - :cost WHERE total_points >= :cost`)
- Shop page renders, purchase flow works end-to-end
- All tests pass

---

### TASK-017 · Parent / teacher dashboard
**Branch**: `feat/parent-dashboard`
**Status**: Not started
**Depends on**: TASK-002, TASK-004, TASK-005

**Description**
Extend the admin interface so a teacher can view each child's progress: quiz history, total points, quiz count, and weak tables. Read-only; no new auth role needed (admin token reused).

**Backend scope**
- `backend/app/routers/admin.py` — add:
  - `GET /admin/users` — list all registered users with `{ username, display_name, total_points, quiz_count, current_streak, last_quiz_date }`; requires admin JWT
  - `GET /admin/users/{username}/stats` — full stats for one user: same as above + last 10 quiz sessions (score, duration, tables, points, date) + weak spots (reuse logic from TASK-015)

**Frontend scope**
- `frontend/src/app/admin/page.tsx` — extend beyond just username management:
  - Tabbed layout: "Usernames" (existing) | "Students"
  - Students tab: table of all users with sortable columns (name, points, quizzes, streak)
  - Clicking a row expands to show recent quiz history and weak tables inline

**Tests to write** (`backend/tests/test_admin.py`):
- `test_admin_list_users_returns_all`
- `test_admin_user_stats_not_found` → 404
- `test_admin_user_stats_contains_quiz_history`
- `test_non_admin_cannot_access_user_list` → 403

**PR criteria**
- Admin dashboard shows real student data
- All queries are read-only (no mutation endpoints in this task)
- Tests pass

---

## Future Enhancements

### Avatar & Profile Customisation
- **Cartoon avatar picker**: Pre-drawn cast of characters (animals, robots, wizards, astronauts, dinosaurs). Kids pick one on signup or from their profile page.
- **Avatar accessories shop**: Spend earned points on hats, capes, glasses, wings. Purely cosmetic but highly motivating for this age group.
- **Avatar evolution**: Avatar "levels up" visually at point milestones (e.g. 100 pts → glowing border, 500 pts → new background aura).
- **Profile photo upload**: Optional parent-managed photo alongside or instead of cartoon avatar.
- **Nickname / display name**: Already in schema; surface this more prominently in the profile UI.

### Leaderboard Enhancements
- **Multiple leaderboard views**: All-time top scores | This week | Most active (quiz count) | Best improver (biggest point gain vs. prior week) | Fastest average quiz time
- **Class/group view**: Teacher or admin creates a "class" grouping; children only see classmates on their leaderboard.
- **Weekly resets with trophies**: Weekly winner earns a seasonal trophy badge visible on their profile.
- **Personal bests**: Each child sees their own records (fastest quiz, highest single-quiz score) prominently.

### Achievement Badges
- **Milestones**: "First Quiz!", "10 Quizzes Done", "100 Points Club", "Times Tables Master"
- **Table-specific**: "2× Champion", "7× Conquered" (complete 5 perfect quizzes for that table)
- **Streak badges**: Persistent cross-session streaks ("3 days in a row!", "Week Warrior")
- **Speed badges**: Complete a quiz under a time threshold
- **Badge showcase**: Display earned badges on profile, visible to other users

### Streaks & Daily Engagement
- **Cross-session login streaks**: "Day 3 in a row!" with animated flame counter on login
- **Daily challenge**: A special themed 10-question quiz each day; bonus points for completing it
- **Weekly challenge**: Harder mixed-table quiz available Monday–Sunday; separate leaderboard just for that week's challenge

### Sound & Animation
- Sound effects: cheerful ding for correct, soft thud for wrong, fanfare at quiz end
- Confetti explosion on perfect score
- Avatar reacts: bounces/cheers on correct answer, shakes head on wrong
- Streak fire animation grows as consecutive correct answers build up

### Learning & Practice Features
- **Practice mode**: No timer, hints available (tap to reveal correct answer with no penalty), encouragement-focused
- **Weak spots analysis**: After several quizzes, profile shows "You find 7× and 8× hardest — want to practise those?" with a targeted quick quiz
- **Flashcard mode**: Simple tap-to-flip cards for memorisation before attempting a quiz
- **Speed round**: 20 questions, 60-second timer — for confident older kids

### Social & Multiplayer
- **Challenge a friend**: Send a quiz challenge link; friend completes the same question set; compare scores
- **Class competition**: Teacher-triggered event where all class members' scores for a set period go to a special board
- **Parent/teacher dashboard**: View each child's progress, quiz history, weak areas; send encouragement messages

### Rewards & Unlockables
- **Points shop**: Spend points on avatar accessories, background themes (space, underwater, jungle), profile borders
- **Printable certificates**: "Alice has mastered the 5× table!" — downloadable PDF
- **Trophy cabinet**: Visible shelf of earned badges and trophies on the profile page
