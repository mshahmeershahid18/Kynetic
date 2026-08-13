"""Runtime configuration for the Kynetic AI service."""

from __future__ import annotations

import os
from pathlib import Path

try:  # python-dotenv is optional: in production the platform injects real env vars.
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None


def _load_env_files() -> None:
    """Loads local env files so `uvicorn main:app` picks up the same keys the
    Next.js app uses.

    Without this the service starts with no GEMINI_API_KEY, silently falls back
    to the deterministic generator, and every generated workout comes out
    identical. Existing environment variables always win, so deployments that
    set real ones are unaffected.
    """
    if load_dotenv is None:
        return

    here = Path(__file__).resolve().parent
    for candidate in (here / ".env", here.parents[1] / ".env.local", here.parents[1] / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


_load_env_files()


def _flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    """Environment-driven settings, read once at import time."""

    def __init__(self) -> None:
        self.gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
        self.gemini_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))

        # Supabase issues HS256 JWTs signed with the project's JWT secret.
        self.supabase_jwt_secret: str | None = os.getenv("SUPABASE_JWT_SECRET") or None
        self.jwt_audience: str = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

        # Auth is enforced by default whenever a secret is configured. Set
        # REQUIRE_AUTH=false only for local development without Supabase.
        self.require_auth: bool = _flag("REQUIRE_AUTH", self.supabase_jwt_secret is not None)

        self.allowed_origins: list[str] = [
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        ]

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key)


settings = Settings()
