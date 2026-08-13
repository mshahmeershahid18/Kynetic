"""Video analysis using Gemini File API."""

import json
import logging
import os
import tempfile
import time
from typing import Any

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger("kynetic.ai.video")

def analyze_exercise_video(video_bytes: bytes, exercise_kind: str, mime_type: str = "video/mp4") -> dict[str, Any] | None:
    if not settings.gemini_enabled:
        logger.warning("Gemini is disabled. Cannot analyze video.")
        return None

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        
        # Write bytes to a temporary file since genai.Client.files.upload requires a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            tmp_file.write(video_bytes)
            tmp_path = tmp_file.name

        try:
            logger.info("Uploading video to Gemini File API...")
            uploaded_file = client.files.upload(file=tmp_path, config={"mime_type": mime_type})
            logger.info("Uploaded video as %s", uploaded_file.name)

            # Wait for processing
            while uploaded_file.state.name == "PROCESSING":
                logger.info("Waiting for video processing...")
                time.sleep(2)
                uploaded_file = client.files.get(name=uploaded_file.name)

            if uploaded_file.state.name == "FAILED":
                logger.error("Video processing failed in Gemini.")
                return None

            prompt = f"""
            You are an expert fitness coach analyzing an exercise video.
            The user is performing a '{exercise_kind}'.
            
            Analyze their form and count the number of completed repetitions.
            
            Respond with ONLY a JSON object that perfectly matches this structure:
            {{
                "rep_count": number (completed reps only),
                "average_depth": number (0-100 percentage of range of motion),
                "form_score": number (0-100 overall form quality),
                "form_warnings": array of strings (specific feedback or corrections if any, max 5),
                "tracking_quality": number (0-100 percentage of how well you could see the body)
            }}
            
            Do not include Markdown formatting blocks (like ```json), just the raw JSON object.
            """

            logger.info("Calling Gemini model %s for video analysis...", settings.gemini_model)
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=[uploaded_file, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )

            # Clean up the file from Gemini
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as e:
                logger.warning("Failed to delete file from Gemini: %s", e)

            if not response.text:
                return None

            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                logger.error("Gemini returned invalid JSON: %s", response.text)
                return None

        finally:
            os.remove(tmp_path)

    except Exception as e:
        logger.error("Error during Gemini video analysis: %s", e)
        return None
