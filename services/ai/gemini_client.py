"""Gemini-backed workout generation and coaching feedback.

The service always returns a usable answer: if Gemini is unconfigured, times
out, or returns something that fails validation, the caller falls back to the
deterministic engine. Callers can tell which happened from the `generator`
field on the response.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

_client = None
_client_failed = False


def _get_client():
    """Lazily construct the Gemini client so import never hard-fails."""
    global _client, _client_failed

    if _client is not None or _client_failed:
        return _client
    if not settings.gemini_enabled:
        _client_failed = True
        return None

    try:
        from google import genai  # imported lazily; optional at runtime

        _client = genai.Client(api_key=settings.gemini_api_key)
        return _client
    except Exception:  # pragma: no cover - depends on the deployed environment
        logger.exception("Could not initialise the Gemini client.")
        _client_failed = True
        return None


# ---------------------------------------------------------------------------
# Response schemas (Gemini structured output)
# ---------------------------------------------------------------------------

_EXERCISE_SCHEMA = {
    "type": "object",
    "properties": {
        "slug": {"type": "string", "description": "Must be one of the provided library slugs."},
        "name": {"type": "string"},
        "muscle_group": {"type": "string"},
        "equipment": {"type": "string"},
        "sets": {"type": "integer"},
        "reps": {"type": "string", "description": "e.g. '8-10', '12', '45 sec'"},
        "rest_seconds": {"type": "integer"},
        "instructions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["slug", "name", "muscle_group", "equipment", "sets", "reps", "rest_seconds", "instructions"],
}

WORKOUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "duration_minutes": {"type": "integer"},
        "difficulty": {"type": "string"},
        "goal": {"type": "string"},
        "warmup": {"type": "array", "items": {"type": "string"}},
        "blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "focus": {"type": "string"},
                    "exercises": {"type": "array", "items": _EXERCISE_SCHEMA},
                },
                "required": ["name", "focus", "exercises"],
            },
        },
        "cooldown": {"type": "array", "items": {"type": "string"}},
        "coaching_notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "title", "summary", "duration_minutes", "difficulty", "goal",
        "warmup", "blocks", "cooldown", "coaching_notes",
    ],
}

FEEDBACK_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "summary": {"type": "string"},
        "wins": {"type": "array", "items": {"type": "string"}},
        "improvements": {"type": "array", "items": {"type": "string"}},
        "difficulty_fit": {"type": "string"},
        "suggestions": {"type": "array", "items": {"type": "string"}},
        "next_time_focus": {"type": "string"},
    },
    "required": [
        "headline", "summary", "wins", "improvements",
        "difficulty_fit", "suggestions", "next_time_focus",
    ],
}


WORKOUT_SYSTEM_PROMPT = """\
You are Kynetic's strength and conditioning coach. You design safe, specific, \
single-session workout plans.

Hard rules:
1. Every exercise you prescribe MUST come from the provided exercise library. \
Copy the `slug`, `name`, `muscle_group` and `equipment` values exactly as given.
2. Never prescribe equipment the user does not have. Bodyweight exercises are \
always allowed.
3. Respect the user's stated limitations and injuries absolutely. If a movement \
could aggravate a stated limitation, choose a different one.
4. Keep total working time within the user's available minutes, allowing for \
the prescribed rest periods.
5. Scale volume and exercise selection to the user's experience level and to \
the recent-performance signals you are given.
6. Write instructions as short, concrete, second-person coaching sentences.
7. Return between 4 and 6 exercises across your blocks.
"""

FEEDBACK_SYSTEM_PROMPT = """\
You are Kynetic's coach reviewing one completed training session.

Hard rules:
1. Ground every statement in the numbers you are given. Do not invent metrics.
2. If camera form data is present (rep count, average depth, form score, form \
warnings), speak to it directly and specifically.
3. Judge whether the difficulty actually fit, using completion rate and how it \
compares to the user's recent sessions.
4. Give 2 to 3 concrete, actionable suggestions for the next session.
5. Be encouraging but honest. Do not praise poor form.
6. Address the user as "you". Keep the summary under 80 words.
"""


def _generate_json(system_prompt: str, user_prompt: str, schema: dict[str, Any]) -> dict[str, Any] | None:
    """Calls Gemini and returns parsed JSON, or None if anything goes wrong."""
    client = _get_client()
    if client is None:
        return None

    try:
        from google.genai import types

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.7,
                http_options=types.HttpOptions(
                    timeout=int(settings.gemini_timeout_seconds * 1000)
                ),
            ),
        )
    except Exception:
        logger.exception("Gemini request failed; falling back to the deterministic engine.")
        return None

    text = (getattr(response, "text", None) or "").strip()
    if not text:
        logger.warning("Gemini returned an empty response.")
        return None

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Gemini returned non-JSON content.")
        return None

    return parsed if isinstance(parsed, dict) else None


# ---------------------------------------------------------------------------
# Workout generation
# ---------------------------------------------------------------------------

def _format_library(library: list[dict[str, Any]]) -> str:
    if not library:
        return "(no library supplied — you may not prescribe any exercise)"
    lines = []
    for item in library:
        vision = item.get("vision_kind")
        marker = f" [live-form-tracking: {vision}]" if vision else ""
        lines.append(
            f"- slug={item.get('slug')} | name={item.get('name')} | "
            f"muscle_group={item.get('muscle_group')} | equipment={item.get('equipment')} | "
            f"difficulty={item.get('difficulty')}{marker}"
        )
    return "\n".join(lines)


def _format_history(context: dict[str, Any]) -> str:
    sessions = context.get("recent_sessions") or []
    feedback = context.get("recent_feedback") or []
    if not sessions and not feedback:
        return "This is the user's first workout. Start conservatively."

    lines = []
    for index, session in enumerate(sessions[:5], start=1):
        data = session.get("session_data") or {}
        parts = [f"session {index}:"]
        if data.get("plan_title"):
            parts.append(f"plan '{data['plan_title']}'")
        if data.get("completed_sets") is not None and data.get("total_sets"):
            parts.append(f"{data['completed_sets']}/{data['total_sets']} sets completed")
        if data.get("form_score") is not None:
            parts.append(f"form score {data['form_score']}")
        if data.get("rep_count") is not None:
            parts.append(f"{data['rep_count']} tracked reps")
        if data.get("perceived_difficulty"):
            parts.append(f"felt {str(data['perceived_difficulty']).replace('_', ' ')}")
        lines.append("- " + ", ".join(parts))

    for item in feedback[:2]:
        payload = item.get("feedback") or {}
        focus = payload.get("next_time_focus")
        if focus:
            lines.append(f"- previous coaching focus: {focus}")

    return "\n".join(lines)


def _format_recent_plans(context: dict[str, Any]) -> str:
    """Tells the model what it already prescribed.

    Without this the model sees an identical prompt on every generation and, at
    any temperature, keeps landing on the same handful of obvious movements.
    """
    plans = context.get("recent_plans") or []
    slugs = context.get("recent_exercise_slugs") or []
    if not plans and not slugs:
        return "RECENTLY PRESCRIBED\n- nothing yet; this is their first plan."

    lines = ["RECENTLY PRESCRIBED (make this session meaningfully different)"]
    for index, plan in enumerate(plans[:4], start=1):
        title = plan.get("title") or "untitled"
        lines.append(f"- plan {index}: '{title}'")
    if slugs:
        lines.append(f"- movements used recently: {', '.join(str(slug) for slug in slugs[:20])}")
    lines.append(
        "- vary the focus, exercise selection, and rep scheme from the above while still "
        "serving the user's goal."
    )
    return "\n".join(lines)


def generate_workout(profile: dict[str, Any], context: dict[str, Any]) -> dict[str, Any] | None:
    library = context.get("exercise_library") or []

    equipment = profile.get("equipment") or []
    equipment_text = ", ".join(equipment) if equipment else "none (bodyweight only)"
    preferences = profile.get("workout_preferences") or []

    user_prompt = f"""\
Design one workout session for this user.

USER PROFILE
- Goal: {profile.get('goal') or 'general wellness'}
- Experience level: {profile.get('experience_level') or 'none'}
- Activity level: {profile.get('fitness_level') or 'unknown'}
- Age: {profile.get('age') or 'unknown'}
- BMI: {profile.get('bmi') or 'unknown'}
- Available time: {profile.get('available_minutes') or 35} minutes
- Training days per week: {profile.get('available_days_per_week') or 'unknown'}
- Equipment available: {equipment_text}
- Preferences: {', '.join(preferences) if preferences else 'none stated'}
- Limitations / injuries: {profile.get('limitations') or 'none stated'}

RECENT PERFORMANCE
{_format_history(context)}

{_format_recent_plans(context)}

EXERCISE LIBRARY (you may only use these)
{_format_library(library)}

Return the workout as JSON matching the required schema."""

    plan = _generate_json(WORKOUT_SYSTEM_PROMPT, user_prompt, WORKOUT_SCHEMA)
    if plan is None:
        return None

    return _sanitize_plan(plan, library, profile)


def _sanitize_plan(
    plan: dict[str, Any],
    library: list[dict[str, Any]],
    profile: dict[str, Any],
) -> dict[str, Any] | None:
    """Enforces the rules the model was asked to follow.

    A model can hallucinate an exercise or ignore the equipment constraint, so
    every prescribed movement is re-checked against the library before the plan
    is allowed anywhere near the user.
    """
    by_slug = {item.get("slug"): item for item in library if item.get("slug")}
    owned = {str(item).lower() for item in (profile.get("equipment") or [])}

    def allowed(entry: dict[str, Any]) -> bool:
        equipment = str(entry.get("equipment", "bodyweight")).lower()
        if equipment == "bodyweight":
            return True
        return any(equipment in item or item in equipment for item in owned)

    clean_blocks = []
    for block in plan.get("blocks") or []:
        if not isinstance(block, dict):
            continue
        exercises = []
        for exercise in block.get("exercises") or []:
            if not isinstance(exercise, dict):
                continue
            reference = by_slug.get(exercise.get("slug"))
            if reference is None or not allowed(reference):
                logger.info("Dropping unknown or unavailable exercise: %s", exercise.get("slug"))
                continue
            # Trust the library for identity, the model for programming.
            exercises.append({
                "slug": reference["slug"],
                "name": reference["name"],
                "muscle_group": reference.get("muscle_group", ""),
                "equipment": reference.get("equipment", "bodyweight"),
                "sets": max(1, min(8, int(exercise.get("sets") or 3))),
                "reps": str(exercise.get("reps") or "8-12"),
                "rest_seconds": max(15, min(240, int(exercise.get("rest_seconds") or 60))),
                "instructions": [
                    str(step) for step in (exercise.get("instructions") or reference.get("instructions") or [])
                ][:6],
                "vision_kind": reference.get("vision_kind"),
                "demo_media_url": reference.get("demo_media_url"),
                "cues": reference.get("cues") or [],
            })
        if exercises:
            clean_blocks.append({
                "name": str(block.get("name") or "Main block"),
                "focus": str(block.get("focus") or plan.get("goal") or "Full body"),
                "exercises": exercises,
            })

    total = sum(len(block["exercises"]) for block in clean_blocks)
    if total < 3:
        logger.warning("Gemini plan had only %s valid exercises; using the fallback.", total)
        return None

    return {
        "title": str(plan.get("title") or "Your training session"),
        "summary": str(plan.get("summary") or ""),
        "duration_minutes": max(10, min(180, int(plan.get("duration_minutes") or profile.get("available_minutes") or 35))),
        "difficulty": str(plan.get("difficulty") or "beginner"),
        "goal": str(plan.get("goal") or profile.get("goal") or "General wellness"),
        "warmup": [str(item) for item in (plan.get("warmup") or [])][:6],
        "blocks": clean_blocks,
        "cooldown": [str(item) for item in (plan.get("cooldown") or [])][:6],
        "coaching_notes": [str(item) for item in (plan.get("coaching_notes") or [])][:6],
    }


# ---------------------------------------------------------------------------
# Coaching feedback
# ---------------------------------------------------------------------------

def generate_feedback(
    plan: dict[str, Any] | None,
    session: dict[str, Any],
    recent_sessions: list[dict[str, Any]],
    recent_feedback: list[dict[str, Any]],
    profile: dict[str, Any] | None,
) -> dict[str, Any] | None:
    profile = profile or {}

    form_lines = []
    if session.get("rep_count") is not None:
        form_lines.append(f"- Camera-tracked reps: {session['rep_count']}")
    if session.get("average_depth") is not None:
        form_lines.append(f"- Average range of motion: {session['average_depth']}%")
    if session.get("form_score") is not None:
        form_lines.append(f"- Form score: {session['form_score']}/100")
    for warning in session.get("form_warnings") or []:
        form_lines.append(f"- Form warning observed: {warning}")
    form_text = "\n".join(form_lines) if form_lines else "- No camera form data for this session."

    user_prompt = f"""\
Review this completed session.

USER
- Goal: {profile.get('goal') or 'general wellness'}
- Experience level: {profile.get('experience_level') or 'none'}
- Limitations: {profile.get('limitations') or 'none stated'}

SESSION JUST COMPLETED
- Plan: {session.get('plan_title') or (plan or {}).get('title') or 'unknown'}
- Sets completed: {session.get('completed_sets', 'unknown')} of {session.get('total_sets', 'unknown')}
- Exercises: {session.get('total_exercises', 'unknown')}
- Elapsed: {round((session.get('elapsed_seconds') or 0) / 60)} minutes
- Reported difficulty: {str(session.get('perceived_difficulty') or 'not reported').replace('_', ' ')}

FORM TRACKING
{form_text}

RECENT HISTORY
{_format_history({'recent_sessions': recent_sessions, 'recent_feedback': recent_feedback})}

Return your coaching review as JSON matching the required schema."""

    feedback = _generate_json(FEEDBACK_SYSTEM_PROMPT, user_prompt, FEEDBACK_SCHEMA)
    if feedback is None:
        return None

    def string_list(key: str, limit: int) -> list[str]:
        value = feedback.get(key)
        if not isinstance(value, list):
            return []
        return [str(item) for item in value if str(item).strip()][:limit]

    wins = string_list("wins", 4)
    improvements = string_list("improvements", 4)
    suggestions = string_list("suggestions", 4)

    if not feedback.get("headline") or not feedback.get("summary") or not suggestions:
        logger.warning("Gemini feedback was incomplete; using the fallback.")
        return None

    return {
        "headline": str(feedback["headline"]),
        "summary": str(feedback["summary"]),
        "wins": wins,
        "improvements": improvements,
        "difficulty_fit": str(feedback.get("difficulty_fit") or ""),
        "suggestions": suggestions,
        "next_time_focus": str(feedback.get("next_time_focus") or suggestions[0]),
        "metrics": {
            "rep_count": session.get("rep_count"),
            "form_score": session.get("form_score"),
            "completed_sets": session.get("completed_sets"),
        },
    }
