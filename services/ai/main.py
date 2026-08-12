from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Kynetic AI Service",
    version="0.1.0",
    description="Phase 0 scaffold for future workout generation and coaching endpoints.",
)


class ProfileSnapshot(BaseModel):
    goal: str | None = None
    fitness_level: str | None = None
    equipment: list[str] = Field(default_factory=list)
    available_minutes: int | None = None


class GenerateRequest(BaseModel):
    profile: ProfileSnapshot = Field(default_factory=ProfileSnapshot)
    context: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kynetic-ai"}


@app.post("/generate")
def generate_workout(payload: GenerateRequest) -> dict[str, Any]:
    """Placeholder contract for Phase 2 workout generation."""
    return {
        "status": "placeholder",
        "message": "Workout generation will be implemented in a later phase.",
        "received_profile": payload.profile.model_dump(),
        "plan": {
            "title": "Foundation Mobility Preview",
            "blocks": [],
        },
    }
