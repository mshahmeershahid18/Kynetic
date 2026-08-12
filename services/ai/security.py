"""Supabase JWT verification.

The plan requires the Python engine to reject calls from anyone who is not a
signed-in Kynetic user. Next.js forwards the caller's Supabase access token as
a bearer token; we verify the HS256 signature against the project's JWT secret.
"""

from __future__ import annotations

import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings

logger = logging.getLogger(__name__)

# auto_error=False so we can return our own message when auth is disabled.
_bearer = HTTPBearer(auto_error=False)


class AuthedUser:
    def __init__(self, user_id: str | None, email: str | None, verified: bool) -> None:
        self.user_id = user_id
        self.email = email
        self.verified = verified


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthedUser:
    """FastAPI dependency that resolves the calling Supabase user."""

    if not settings.require_auth:
        # Explicitly opted out (local development without Supabase running).
        return AuthedUser(user_id=None, email=None, verified=False)

    if not settings.supabase_jwt_secret:
        # Fail closed: auth is required but we have no way to check it.
        logger.error("REQUIRE_AUTH is on but SUPABASE_JWT_SECRET is not configured.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is misconfigured on the AI service.",
        )

    if credentials is None or not credentials.credentials:
        raise _unauthorized("Missing bearer token.")

    try:
        claims = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.jwt_audience,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as error:
        raise _unauthorized("Session expired. Sign in again.") from error
    except jwt.InvalidTokenError as error:
        raise _unauthorized("Invalid authentication token.") from error

    subject = claims.get("sub")
    if not subject:
        raise _unauthorized("Token is missing a subject claim.")

    return AuthedUser(user_id=subject, email=claims.get("email"), verified=True)
