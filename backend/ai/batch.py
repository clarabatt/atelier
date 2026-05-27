import json
import re

from google import genai
from google.genai import types

from backend.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)

_PROMPT = """\
Generate exactly 20 study questions for the topic "{title}" (domain: {domain}).

Student level context: {level_summary}

Return a JSON array of 20 objects. Each object must have these exact keys:
- "body": the question text (string)
- "format": one of "mcq", "written", "fill_blank"
- "options": array of 4 answer strings when format is "mcq", null otherwise
- "correct_answer": the correct answer (string)
- "reasoning": one sentence explaining why it is correct (string)
- "difficulty": integer 1–5

Distribution: ~10 mcq, ~6 written, ~4 fill_blank.
Difficulty: questions 1–5 difficulty 1–2, questions 6–14 difficulty 3, questions 15–20 difficulty 4–5.
Tailor difficulty and content to the student's level context above.
Return only the JSON array with no other text.
"""


def generate_batch(title: str, domain: str, level_summary: str) -> list[dict]:
    prompt = _PROMPT.format(title=title, domain=domain, level_summary=level_summary)

    response = _client.models.generate_content(
        model=settings.gemini_model,
        contents=[{"role": "user", "parts": [{"text": prompt}]}],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=8192,
        ),
    )

    text = response.text.strip()
    # Strip markdown fences if the model adds them despite response_mime_type
    text = re.sub(r"^```(?:json)?\n?", "", text)
    text = re.sub(r"\n?```$", "", text.strip())

    questions = json.loads(text)
    if not isinstance(questions, list) or not questions:
        raise ValueError("AI returned an unexpected response for batch generation")
    return questions
