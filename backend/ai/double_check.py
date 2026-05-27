import json
import re

from google import genai
from google.genai import types

from backend.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)

_PROMPT = """\
Re-evaluate whether the original grading verdict was correct.

Question: {question_body}
Correct answer: {correct_answer}
Student's answer: {user_answer}
Original verdict: {original_status}

Consider whether the student's answer captures the core concept, even if phrased differently.

Return a JSON object with exactly two keys:
- "verdict": either "confirmed" (the original verdict was correct) or "overridden" (the original verdict should be reversed)
- "explanation": one sentence explaining your decision

Return only the JSON object with no other text.
"""

_VALID_VERDICTS = frozenset({"confirmed", "overridden"})


def ai_double_check(
    question_body: str,
    correct_answer: str,
    user_answer: str,
    original_status: str,
) -> dict:
    prompt = _PROMPT.format(
        question_body=question_body,
        correct_answer=correct_answer,
        user_answer=user_answer,
        original_status=original_status,
    )

    response = _client.models.generate_content(
        model=settings.gemini_model,
        contents=[{"role": "user", "parts": [{"text": prompt}]}],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=256,
        ),
    )
    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\n?", "", text)
    text = re.sub(r"\n?```$", "", text.strip())

    try:
        data = json.loads(text)
        if data.get("verdict") not in _VALID_VERDICTS or "explanation" not in data:
            raise ValueError("unexpected structure")
        return {"verdict": data["verdict"], "explanation": str(data["explanation"])}
    except (json.JSONDecodeError, ValueError, KeyError, AttributeError):
        return {"verdict": "confirmed", "explanation": "Could not re-evaluate — original verdict stands."}
