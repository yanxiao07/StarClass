from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.routers import auth, users, classes, homeworks, submissions, agents, chat, knowledge, store, llm_config

app = FastAPI(
    title="StarClass AI Agent Platform",
    description="AI-powered educational platform with multi-agent system",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(classes.router, prefix="/api/classes", tags=["Classes"])
app.include_router(homeworks.router, prefix="/api/homeworks", tags=["Homeworks"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(store.router, prefix="/api/store", tags=["Store"])
app.include_router(llm_config.router, prefix="/api/llm", tags=["LLM Config"])

static_dir = Path(__file__).parent.parent / "uploads"
static_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(static_dir)), name="uploads")

@app.get("/")
async def root():
    return {"message": "Welcome to StarClass AI Agent Platform"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "starclass-backend"}