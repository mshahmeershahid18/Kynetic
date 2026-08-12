from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from feedback_engine import build_feedback

app = FastAPI(
    title="Kynetic AI Service",
    version="0.3.0",
    description="Deterministic workout generation and coaching feedback endpoints for the Kynetic MVP.",
)


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


EXERCISES: list[dict[str, Any]] = [
    {
        "name": "Goblet squat",
        "muscle_group": "Lower body",
        "equipment": "dumbbells",
        "sets": 3,
        "reps": "8-10",
        "rest_seconds": 75,
        "instructions": ["Hold one weight at chest height.", "Sit hips back with a proud chest.", "Stand by driving through your whole foot."],
    },
    {
        "name": "Push-up",
        "muscle_group": "Chest",
        "equipment": "bodyweight",
        "sets": 3,
        "reps": "6-12",
        "rest_seconds": 60,
        "instructions": ["Brace in a straight plank.", "Lower until chest nears the floor.", "Press up while keeping elbows controlled."],
    },
    {
        "name": "Bent-over row",
        "muscle_group": "Back",
        "equipment": "dumbbells",
        "sets": 3,
        "reps": "10-12",
        "rest_seconds": 60,
        "instructions": ["Hinge with a neutral spine.", "Pull weights toward lower ribs.", "Lower slowly."],
    },
    {
        "name": "Reverse lunge",
        "muscle_group": "Lower body",
        "equipment": "bodyweight",
        "sets": 2,
        "reps": "8 each side",
        "rest_seconds": 60,
        "instructions": ["Step back into a split stance.", "Lower under control.", "Push through the front foot to return."],
    },
    {
        "name": "Plank",
        "muscle_group": "Core",
        "equipment": "bodyweight",
        "sets": 3,
        "reps": "30-45 sec",
        "rest_seconds": 45,
        "instructions": ["Stack elbows under shoulders.", "Keep ribs tucked and glutes squeezed.", "Breathe steadily."],
    },
    {
        "name": "Marching high knees",
        "muscle_group": "Conditioning",
        "equipment": "bodyweight",
        "sets": 3,
        "reps": "45 sec",
        "rest_seconds": 30,
        "instructions": ["Stand tall.", "Drive knees up one at a time.", "Keep a brisk sustainable rhythm."],
    },
]


def _difficulty(profile: ProfileSnapshot, context: dict[str, Any]) -> str:
    level = f"{profile.experience_level or ''} {profile.fitness_level or ''}".lower()
    base = "beginner"
    if any(token in level for token in ["experienced", "athlete", "high"]):
        base = "advanced"
    elif any(token in level for token in ["intermediate", "moderate"]):
        base = "intermediate"

    recent_sessions = context.get("recent_sessions", [])
    if not recent_sessions:
        return base

    # Check the last 3 sessions completion rate
    total_expected = 0
    total_completed = 0
    recent_form_scores = []
    
    for session in recent_sessions[:3]:
        data = session.get("session_data", {})
        if "total_sets" in data and "completed_sets" in data:
            total_expected += data.get("total_sets", 0)
            total_completed += data.get("completed_sets", 0)
        if "form_score" in data:
            recent_form_scores.append(data["form_score"])

    completion_rate = total_completed / total_expected if total_expected > 0 else 1.0
    avg_form = sum(recent_form_scores) / len(recent_form_scores) if recent_form_scores else 80

    if completion_rate >= 0.95 and avg_form >= 85:
        if base == "beginner": return "beginner+"
        if base == "intermediate": return "intermediate+"
        if base == "advanced": return "advanced+"
    elif completion_rate < 0.60:
        if base == "intermediate": return "intermediate-"
        if base == "advanced": return "advanced-"
    
    return base


def _allowed(exercise: dict[str, Any], equipment: list[str]) -> bool:
    if exercise["equipment"] == "bodyweight":
        return True
    owned = [item.lower() for item in equipment]
    return any(exercise["equipment"] in item or item in exercise["equipment"] for item in owned)


def _select_exercises(profile: ProfileSnapshot, context: dict[str, Any]) -> list[dict[str, Any]]:
    goal = (profile.goal or "").lower()
    if "endurance" in goal or "fat" in goal:
        ordered = [EXERCISES[5], EXERCISES[3], EXERCISES[1], EXERCISES[4], EXERCISES[0]]
    else:
        ordered = EXERCISES[:5]

    selected = [exercise.copy() for exercise in ordered if _allowed(exercise, profile.equipment)]
    if len(selected) < 4:
        selected.extend(exercise.copy() for exercise in ordered if exercise["equipment"] == "bodyweight" and exercise not in selected)

    diff = _difficulty(profile, context)
    for exercise in selected:
        if diff == "beginner":
            exercise["sets"] = min(exercise["sets"], 2)
        elif diff.endswith("+"):
            exercise["sets"] = exercise["sets"] + 1

    return selected[:5]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "kynetic-ai"}


@app.post("/generate")
def generate_workout(payload: GenerateRequest) -> dict[str, Any]:
    profile = payload.profile
    context = payload.context
    minutes = profile.available_minutes or 35
    goal = profile.goal or "General wellness"
    plan = {
        "title": f"{goal} session",
        "summary": f"A {minutes}-minute workout personalized for your current profile and available equipment.",
        "duration_minutes": minutes,
        "difficulty": _difficulty(profile, context),
        "goal": goal,
        "warmup": ["3 minutes easy movement", "10 bodyweight good mornings", "10 arm circles each direction"],
        "blocks": [{"name": "Main training block", "focus": goal, "exercises": _select_exercises(profile, context)}],
        "cooldown": ["60 seconds slow breathing", "Standing quad stretch", "Chest and lat stretch"],
        "coaching_notes": [
            "Prioritize smooth reps over speed.",
            f"Respect this limitation: {profile.limitations}" if profile.limitations else "Use a pain-free range of motion.",
            "Record completion so Kynetic can adapt future sessions.",
        ],
    }
    return {"status": "ok", "plan": plan, "received_profile": profile.model_dump(), "context_keys": list(context.keys())}


@app.post("/feedback")
def generate_feedback(payload: FeedbackRequest) -> dict[str, Any]:
    feedback = build_feedback(
        plan=payload.plan,
        session=payload.session,
        recent_sessions=payload.recent_sessions,
        recent_feedback=payload.recent_feedback,
        profile=payload.profile,
    )
    return {"status": "ok", "feedback": feedback}
