from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, auth, health, leaderboard, quiz, users

app = FastAPI(title="workout-maths API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(quiz.router)
app.include_router(leaderboard.router)


@app.get("/")
async def root():
    return {"message": "workout-maths API"}
