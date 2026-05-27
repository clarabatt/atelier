from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import auth, sessions, stats, topics, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Atelier", version="0.1.0", lifespan=lifespan)

_extra = [o.strip() for o in settings.extra_origins.split(",") if o.strip()]
_origins = list({settings.frontend_url, *_extra})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])


@app.get("/health")
def health():
    return {"status": "ok"}
