from __future__ import annotations

from statistics import mean
from typing import Any


def _safe_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _session_metric(session: dict[str, Any] | None, key: str) -> float | None:
    if not session:
        return None
    direct = _safe_number(session.get(key))
    if direct is not None:
        return direct
    data = session.get("session_data")
    if isinstance(data, dict):
        return _safe_number(data.get(key))
    return None


def _sum_completed_sets(session: dict[str, Any]) -> int | None:
    value = _session_metric(session, "completed_sets")
    if value is not None:
        return int(value)
    data = session.get("session_data") if isinstance(session, dict) else None
    exercise_log = data.get("exercise_log") if isinstance(data, dict) else None
    if not isinstance(exercise_log, list):
        return None
    total = 0
    for entry in exercise_log:
        if isinstance(entry, dict):
            total += int(_safe_number(entry.get("completed_sets")) or 0)
    return total or None


def _history_average(history: list[dict[str, Any]], key: str) -> float | None:
    values = [_session_metric(session, key) for session in history]
    cleaned = [value for value in values if value is not None]
    return mean(cleaned) if cleaned else None


def _score_label(value: float | None) -> str:
    if value is None:
        return "not logged yet"
    if value >= 85:
        return "strong"
    if value >= 70:
        return "solid"
    return "needs attention"


def _completion_rate(session: dict[str, Any]) -> float | None:
    completed = _session_metric(session, "completed_sets")
    target = _session_metric(session, "total_sets")
    if target and target > 0 and completed is not None:
        return max(0.0, min(1.25, completed / target))
    return None


def build_feedback(
    *,
    plan: dict[str, Any] | None,
    session: dict[str, Any],
    recent_sessions: list[dict[str, Any]],
    recent_feedback: list[dict[str, Any]],
    profile: dict[str, Any] | None,
) -> dict[str, Any]:
    """Create deterministic, personalized coaching feedback from session history."""
    plan_title = session.get("plan_title") or (plan or {}).get("title") or "your session"
    goal = (profile or {}).get("goal") or (plan or {}).get("goal") or "your goal"
    difficulty = (plan or {}).get("difficulty") or "current"

    reps = _session_metric(session, "rep_count")
    form_score = _session_metric(session, "form_score")
    avg_depth = _session_metric(session, "average_depth")
    duration_seconds = _session_metric(session, "elapsed_seconds")
    completed_sets = _sum_completed_sets(session)
    completion_rate = _completion_rate(session)

    previous_form = _history_average(recent_sessions, "form_score")
    previous_reps = _history_average(recent_sessions, "rep_count")
    previous_sets = mean([value for value in [_sum_completed_sets(item) for item in recent_sessions] if value is not None]) if recent_sessions else None

    wins: list[str] = []
    improvements: list[str] = []
    suggestions: list[str] = []

    if completed_sets:
        wins.append(f"You finished {completed_sets} working sets, which gives Kynetic useful volume data for the next plan.")
    if reps is not None:
        trend = ""
        if previous_reps is not None:
            delta = reps - previous_reps
            trend = f" ({'up' if delta >= 0 else 'down'} {abs(delta):.0f} vs your recent average)"
        wins.append(f"You logged {reps:.0f} reps{trend}, so the effort signal is tied to your actual performance.")
    if form_score is not None:
        if previous_form is not None and form_score >= previous_form + 3:
            wins.append(f"Form improved to {form_score:.0f}/100 from a recent average of {previous_form:.0f}/100.")
        elif form_score >= 80:
            wins.append(f"Your form score was {_score_label(form_score)} at {form_score:.0f}/100.")

    if completion_rate is not None:
        if completion_rate >= 0.95:
            difficulty_fit = f"The {difficulty} difficulty looks appropriate, and you may be ready for a small progression."
            suggestions.append("Next time, add one set to the first strength move or use the top end of the rep range if form stays clean.")
        elif completion_rate >= 0.75:
            difficulty_fit = f"The {difficulty} difficulty was close to right, but keep the same targets once more before progressing."
            suggestions.append("Repeat a similar session and aim to complete every planned set before adding intensity.")
        else:
            difficulty_fit = f"The {difficulty} difficulty may be a little high for today."
            suggestions.append("Reduce one set from the hardest movement or extend rests by 15-30 seconds next time.")
    else:
        difficulty_fit = f"The {difficulty} difficulty needs more logged completion data before Kynetic can adjust it confidently."
        suggestions.append("Use the guided player so completed sets, time, reps, and form can shape the next plan.")

    if form_score is not None and form_score < 75:
        improvements.append("Prioritize control and alignment before chasing more reps.")
        suggestions.append("Film or track the first set at an easier pace and stop each set when form drops below your standard.")
    if avg_depth is not None:
        if avg_depth < 70:
            improvements.append(f"Average depth was {avg_depth:.0f}%, so range of motion is the main opportunity.")
            suggestions.append("Use a slower 3-second lowering phase and only count reps that reach your target depth.")
        else:
            wins.append(f"Average depth reached {avg_depth:.0f}%, a good sign that reps were not just partials.")
    if previous_sets is not None and completed_sets is not None and completed_sets < previous_sets - 1:
        improvements.append("Volume dipped compared with your recent sessions, so recovery or pacing may have limited output.")

    if duration_seconds:
        minutes = max(1, round(duration_seconds / 60))
        suggestions.append(f"Keep the next session near {minutes} minutes and compare completion rate rather than only total time.")

    if recent_feedback:
        suggestions.append("Carry forward the last coaching cue you received so Kynetic can see whether it improves your next log.")

    if not wins:
        wins.append(f"You completed {plan_title}, which keeps momentum toward {goal}.")
    if not improvements:
        improvements.append("No major red flags were logged; the next step is making the data more precise.")
    if not suggestions:
        suggestions.append("Log reps, form score, depth, and perceived difficulty after the next session for sharper coaching.")

    headline = f"Coach feedback for {plan_title}"
    summary = f"This session supports {goal}. {difficulty_fit}"

    return {
        "headline": headline,
        "summary": summary,
        "wins": wins[:3],
        "improvements": improvements[:3],
        "difficulty_fit": difficulty_fit,
        "suggestions": list(dict.fromkeys(suggestions))[:4],
        "next_time_focus": suggestions[0],
        "metrics": {
            "rep_count": reps,
            "form_score": form_score,
            "average_depth": avg_depth,
            "completed_sets": completed_sets,
            "recent_form_average": previous_form,
            "recent_rep_average": previous_reps,
        },
    }
