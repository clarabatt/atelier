import json
import re

from google import genai
from google.genai import types

from backend.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)

_PROMPT = """\
Grade the student's written answer.

Question: {question_body}
Correct answer: {correct_answer}
Student's answer: {user_answer}

Return a JSON object with exactly two keys:
- "verdict": one of "correct", "partial", "wrong"
  - "correct": the student captured the key concept, even if phrased differently
  - "partial": the student got some aspects right but missed important details
  - "wrong": the answer is incorrect or unrelated to the concept
- "explanation": one sentence explaining the verdict

Return only the JSON object with no other text.
"""

_VALID_VERDICTS = frozenset({"correct", "partial", "wrong"})


def grade_written(question_body: str, correct_answer: str, user_answer: str) -> dict:
    prompt = _PROMPT.format(
        question_body=question_body,
        correct_answer=correct_answer,
        user_answer=user_answer,
    )

    for attempt in range(2):
        try:
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

            data = json.loads(text)
            if data.get("verdict") not in _VALID_VERDICTS or "explanation" not in data:
                raise ValueError("unexpected structure")
            return {"verdict": data["verdict"], "explanation": str(data["explanation"])}
        except (json.JSONDecodeError, ValueError, KeyError, AttributeError):
            if attempt == 1:
                return {
                    "verdict": "wrong",
                    "explanation": "Grading failed — please check the correct answer manually.",
                }

    return {"verdict": "wrong", "explanation": "Grading failed."}
