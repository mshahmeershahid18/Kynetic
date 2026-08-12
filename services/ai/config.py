"""Runtime configuration for the Kynetic AI service."""

from __future__ import annotations

import os


def _flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    """Environment-driven settings, read once at import time."""

    def __init__(self) -> None:
        self.gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
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
