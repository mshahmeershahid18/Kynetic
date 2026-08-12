"""Deterministic workout generator.

This is the safety net behind Gemini. It never calls the network, so the
product stays usable when the API key is missing, the quota is exhausted, or
the model returns something that fails validation.

It draws from the same exercise library the model is given, so plans produced
by either path reference real library entries and keep their demos and
live-form-tracking capability.
"""

from __future__ import annotations

from typing import Any

# Used only when the caller supplies no library at all.
_BUILTIN_LIBRARY: list[dict[str, Any]] = [
    {"slug": "bodyweight-squat", "name": "Bodyweight squat", "muscle_group": "Lower body",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": "squat",
     "instructions": ["Stand with feet shoulder width apart.", "Sit your hips back and down.",
                      "Descend until your thighs are parallel.", "Drive through your whole foot to stand."]},
    {"slug": "push-up", "name": "Push-up", "muscle_group": "Chest",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": "pushup",
     "instructions": ["Set hands slightly wider than your shoulders.", "Brace into a straight plank.",
                      "Lower until your chest nears the floor.", "Press back up without sagging."]},
    {"slug": "reverse-lunge", "name": "Reverse lunge", "muscle_group": "Lower body",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": "lunge",
     "instructions": ["Stand tall, feet hip width apart.", "Step one foot back and lower.",
                      "Keep your torso upright.", "Push through the front foot to return."]},
    {"slug": "glute-bridge", "name": "Glute bridge", "muscle_group": "Glutes",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": "glute_bridge",
     "instructions": ["Lie on your back with knees bent.", "Squeeze your glutes and lift your hips.",
                      "Pause at the top.", "Lower with control."]},
    {"slug": "plank", "name": "Plank", "muscle_group": "Core",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": None,
     "instructions": ["Stack elbows under shoulders.", "Form one straight line.",
                      "Tuck your ribs and squeeze your glutes.", "Breathe steadily."]},
    {"slug": "marching-high-knees", "name": "Marching high knees", "muscle_group": "Conditioning",
     "equipment": "bodyweight", "difficulty": "beginner", "vision_kind": None,
     "instructions": ["Stand tall.", "Drive knees up one at a time.", "Keep a brisk rhythm.",
                      "Land softly."]},
]

# Default programming per muscle group, keyed by goal family.
_REP_SCHEMES = {
    "strength": {"sets": 4, "reps": "5-6", "rest": 120},
    "muscle": {"sets": 3, "reps": "8-12", "rest": 75},
    "endurance": {"sets": 3, "reps": "15-20", "rest": 45},
    "general": {"sets": 3, "reps": "10-12", "rest": 60},
}

_MUSCLE_ORDER = ["Lower body", "Chest", "Back", "Shoulders", "Glutes", "Hamstrings", "Core", "Conditioning"]


def _goal_family(goal: str | None) -> str:
    text = (goal or "").lower()
    if "strength" in text:
        return "strength"
    if "muscle" in text or "build" in text:
        return "muscle"
    if "endurance" in text or "fat" in text or "lose" in text:
        return "endurance"
    return "general"


def _base_difficulty(profile: dict[str, Any]) -> str:
    level = f"{profile.get('experience_level') or ''} {profile.get('fitness_level') or ''}".lower()
    if any(token in level for token in ("experienced", "athlete", "high")):
        return "advanced"
    if any(token in level for token in ("intermediate", "moderate")):
        return "intermediate"
    return "beginner"


def resolve_difficulty(profile: dict[str, Any], context: dict[str, Any]) -> str:
    """Adjusts the base difficulty using recent completion and form data."""
    base = _base_difficulty(profile)

    sessions = context.get("recent_sessions") or []
    if not sessions:
        return base

    expected = 0
    completed = 0
    form_scores: list[float] = []
    for session in sessions[:3]:
        data = session.get("session_data") or {}
        if data.get("total_sets"):
            expected += int(data.get("total_sets") or 0)
            completed += int(data.get("completed_sets") or 0)
        if data.get("form_score") is not None:
            form_scores.append(float(data["form_score"]))

    completion = completed / expected if expected else 1.0
    average_form = sum(form_scores) / len(form_scores) if form_scores else 80.0

    if completion >= 0.95 and average_form >= 85:
        return f"{base}+"
    if completion < 0.60:
        return f"{base}-" if base != "beginner" else base
    return base


def _available(entry: dict[str, Any], equipment: list[str]) -> bool:
    required = str(entry.get("equipment", "bodyweight")).lower()
    if required == "bodyweight":
        return True
    owned = [str(item).lower() for item in equipment]
    return any(required in item or item in required for item in owned)


def _avoids_limitations(entry: dict[str, Any], limitations: str | None) -> bool:
    """Conservative keyword screen so stated injuries are respected."""
    if not limitations:
        return True
    text = limitations.lower()
    muscle = str(entry.get("muscle_group", "")).lower()
    slug = str(entry.get("slug", "")).lower()

    screens = [
        (("knee",), ("lower body", "glutes")),
        (("shoulder",), ("shoulders", "chest")),
        (("back", "spine", "disc"), ("back", "hamstrings")),
        (("wrist",), ("chest",)),
    ]
    for keywords, blocked_groups in screens:
        if any(keyword in text for keyword in keywords):
            if muscle in blocked_groups:
                return False
            if "squat" in slug or "lunge" in slug:
                if any(keyword in text for keyword in ("knee",)):
                    return False
    return True


def generate_workout(profile: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    library = context.get("exercise_library") or _BUILTIN_LIBRARY
    equipment = profile.get("equipment") or []
    limitations = profile.get("limitations")
    goal = profile.get("goal") or "General wellness"
    minutes = int(profile.get("available_minutes") or 35)
    family = _goal_family(goal)
    scheme = _REP_SCHEMES[family]
    difficulty = resolve_difficulty(profile, context)

    candidates = [
        entry for entry in library
        if _available(entry, equipment) and _avoids_limitations(entry, limitations)
    ]
    if not candidates:
        candidates = [entry for entry in _BUILTIN_LIBRARY if _avoids_limitations(entry, limitations)]
    if not candidates:
        candidates = list(_BUILTIN_LIBRARY)

    # One exercise per muscle group, ordered largest movement first, so the
    # session covers the body rather than hammering one area.
    selected: list[dict[str, Any]] = []
    used_groups: set[str] = set()
    for group in _MUSCLE_ORDER:
        for entry in candidates:
            if entry.get("muscle_group") == group and group not in used_groups:
                selected.append(entry)
                used_groups.add(group)
                break

    for entry in candidates:
        if len(selected) >= 5:
            break
        if entry not in selected:
            selected.append(entry)

    # Shorter sessions get fewer movements so the time budget holds.
    limit = 3 if minutes <= 20 else 4 if minutes <= 35 else 5
    selected = selected[:limit]

    sets = scheme["sets"]
    if difficulty.startswith("beginner"):
        sets = max(2, sets - 1)
    if difficulty.endswith("+"):
        sets += 1
    elif difficulty.endswith("-"):
        sets = max(2, sets - 1)

    exercises = [{
        "slug": entry.get("slug"),
        "name": entry.get("name"),
        "muscle_group": entry.get("muscle_group", ""),
        "equipment": entry.get("equipment", "bodyweight"),
        "sets": sets,
        "reps": scheme["reps"],
        "rest_seconds": scheme["rest"],
        "instructions": list(entry.get("instructions") or []),
        "vision_kind": entry.get("vision_kind"),
        "demo_media_url": entry.get("demo_media_url"),
        "cues": list(entry.get("cues") or []),
    } for entry in selected]

    notes = [
        "Prioritize smooth, controlled reps over speed.",
        "Stop a set if your technique breaks down rather than grinding it out.",
    ]
    if limitations:
        notes.insert(0, f"Working around your stated limitation: {limitations}.")

    return {
        "title": f"{goal} session",
        "summary": (
            f"A {minutes}-minute {difficulty} workout built from your goal, equipment, "
            "and recent training history."
        ),
        "duration_minutes": minutes,
        "difficulty": difficulty,
        "goal": goal,
        "warmup": [
            "3 minutes of easy movement to raise your temperature",
            "10 bodyweight good mornings",
            "10 arm circles in each direction",
        ],
        "blocks": [{"name": "Main training block", "focus": goal, "exercises": exercises}],
        "cooldown": [
            "60 seconds of slow nasal breathing",
            "Standing quad stretch, 30 seconds per side",
            "Chest and lat stretch, 30 seconds per side",
        ],
        "coaching_notes": notes,
    }
