# Kynetic AI Service

FastAPI scaffold for future AI workout generation and coaching feedback.

## Run locally

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints:

- `GET /health` returns service status.
- `POST /generate` returns a placeholder workout-generation contract for later phases.
