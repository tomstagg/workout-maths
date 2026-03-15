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
