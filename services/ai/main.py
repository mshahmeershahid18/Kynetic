"""Kynetic AI service.

Two endpoints, both authenticated against Supabase:
  POST /generate  — build a personalized workout plan
  POST /feedback  — coach a completed session

Gemini does the reasoning. A deterministic engine backs both endpoints so the
product degrades gracefully instead of failing when the model is unavailable.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import fallback_generator
import gemini_client
import video_analyzer
from config import settings
from feedback_engine import build_feedback
from security import AuthedUser, require_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kynetic.ai")

app = FastAPI(
    title="Kynetic AI Service",
    version="1.0.0",
    description="Gemini-backed workout generation and coaching feedback for Kynetic.",
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.on_event("startup")
def log_configuration() -> None:
    logger.info("Gemini enabled: %s (model=%s)", settings.gemini_enabled, settings.gemini_model)
    if not settings.gemini_enabled:
        logger.warning("GEMINI_API_KEY is not set — every request will use the deterministic engine.")
    if not settings.require_auth:
        logger.warning("REQUIRE_AUTH is off — endpoints are unauthenticated. Do not run this in production.")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ProfileSnapshot(BaseModel):
    goal: str | None = None
    fitness_level: str | None = None
    experience_level: str | None = None
    equipment: list[str] = Field(default_factory=list)
    workout_preferences: list[str] = Field(default_factory=list)
    available_minutes: int | None = None
    available_days_per_week: int | None = None
    limitations: str | None = None
    age: int | None = None
    bmi: float | None = None


class GenerateRequest(BaseModel):
    profile: ProfileSnapshot = Field(default_factory=ProfileSnapshot)
    context: dict[str, Any] = Field(default_factory=dict)


class FeedbackRequest(BaseModel):
    plan: dict[str, Any] | None = None
    session: dict[str, Any] = Field(default_factory=dict)
    recent_sessions: list[dict[str, Any]] = Field(default_factory=list)
    recent_feedback: list[dict[str, Any]] = Field(default_factory=list)
    profile: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    """Unauthenticated so platform health checks keep working."""
    return {
        "status": "ok",
        "service": "kynetic-ai",
        "gemini_enabled": settings.gemini_enabled,
        "model": settings.gemini_model if settings.gemini_enabled else None,
        "auth_required": settings.require_auth,
    }


@app.post("/generate")
def generate_workout(
    payload: GenerateRequest,
    user: AuthedUser = Depends(require_user),
) -> dict[str, Any]:
    profile = payload.profile.model_dump()
    context = payload.context

    plan = gemini_client.generate_workout(profile, context)
    generator = "gemini"

    if plan is None:
        plan = fallback_generator.generate_workout(profile, context)
        generator = "deterministic"

    logger.info("Generated plan via %s for user %s", generator, user.user_id or "anonymous")
    return {"status": "ok", "generator": generator, "plan": plan}


@app.post("/feedback")
def generate_feedback(
    payload: FeedbackRequest,
    user: AuthedUser = Depends(require_user),
) -> dict[str, Any]:
    feedback = gemini_client.generate_feedback(
        plan=payload.plan,
        session=payload.session,
        recent_sessions=payload.recent_sessions,
        recent_feedback=payload.recent_feedback,
        profile=payload.profile,
    )
    generator = "gemini"

    if feedback is None:
        feedback = build_feedback(
            plan=payload.plan,
            session=payload.session,
            recent_sessions=payload.recent_sessions,
            recent_feedback=payload.recent_feedback,
            profile=payload.profile,
        )
        generator = "deterministic"

    logger.info("Generated feedback via %s for user %s", generator, user.user_id or "anonymous")
    return {"status": "ok", "generator": generator, "feedback": feedback}


@app.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(...),
    kind: str = Form(...),
    user: AuthedUser = Depends(require_user),
) -> dict[str, Any]:
    logger.info("Received video analysis request for user %s, kind: %s", user.user_id or "anonymous", kind)
    video_bytes = await video.read()
    
    result = video_analyzer.analyze_exercise_video(video_bytes, kind, video.content_type)
    if result is None:
        return {"status": "error", "message": "Failed to analyze video."}
        
    return {"status": "ok", "summary": result}

