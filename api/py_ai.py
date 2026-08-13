import sys
import os
from pathlib import Path
from fastapi import FastAPI

# Add services/ai to sys.path so the module can find its imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "services" / "ai"))

from main import app as original_app

# Vercel will map this file to /api/py_ai. We mount the FastAPI app there.
app = FastAPI()
app.mount("/api/py_ai", original_app)
