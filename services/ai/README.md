# Kynetic AI Service

Gemini-backed workout generation and coaching feedback for Kynetic.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Status, Gemini availability, auth mode |
| POST | `/generate` | Supabase JWT | Build a personalized workout plan |
| POST | `/feedback` | Supabase JWT | Coach a completed session |

`/health` is intentionally unauthenticated so platform health checks work.

## How generation works

1. Next.js sends the user's profile, recent sessions, recent feedback, and the
   full exercise library.
2. Gemini is prompted with structured JSON output (`gemini_client.py`).
3. **Every returned plan is re-validated server side.** `_sanitize_plan` drops any
   exercise that is not in the library or that requires equipment the user does
   not have, and rejects the whole plan if fewer than 3 valid exercises survive.
   A model cannot put an unavailable or invented movement in front of a user.
4. If Gemini is unconfigured, times out, or fails validation, the deterministic
   engine in `fallback_generator.py` produces the plan instead.

The response's `generator` field is `"gemini"` or `"deterministic"` so the caller
always knows which path ran.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | — | Without it, every request uses the deterministic engine |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `GEMINI_TIMEOUT_SECONDS` | `30` | |
| `SUPABASE_JWT_SECRET` | — | Supabase → Settings → API → JWT Secret |
| `REQUIRE_AUTH` | true when a secret is set | Set `false` only for local dev |
| `SUPABASE_JWT_AUDIENCE` | `authenticated` | |
| `ALLOWED_ORIGINS` | — | Comma-separated; enables CORS when set |

### Security

Auth **fails closed**. If `REQUIRE_AUTH` is on but no secret is configured, the
service returns 500 rather than serving traffic unauthenticated. Always set
`SUPABASE_JWT_SECRET` in production.

## Run locally

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export GEMINI_API_KEY=...          # optional
export REQUIRE_AUTH=false          # local only, no Supabase needed

uvicorn main:app --reload --port 8000
```

## Docker

```bash
docker build -t kynetic-ai services/ai
docker run -p 8000:8000 \
  -e GEMINI_API_KEY=... \
  -e SUPABASE_JWT_SECRET=... \
  kynetic-ai
```
