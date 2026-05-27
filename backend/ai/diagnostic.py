import re

from google import genai
from google.genai import types

from backend.config import settings
from backend.schemas.topics import DiagnosticMessage

_client = genai.Client(api_key=settings.gemini_api_key)

_SYSTEM = """\
You are a diagnostic assistant for a personalised learning app.
The user wants to study "{title}" (domain: {domain}).

Your goal is to determine their actual knowledge level through direct, specific questions.

Rules:
- Ask one question at a time. Wait for the answer before continuing.
- Ask between 2 and 4 questions total.
- Every question must test concrete knowledge — ask the user to recall a fact, \
solve a problem, define a term, give an example, or explain a concept. \
Do NOT ask about goals, motivations, past experience, or what they hope to learn.
- Start with a mid-difficulty question. If the answer is strong, go harder next; \
if weak or wrong, go easier. Adapt as you learn their level.
- Keep responses short: one question per turn, no preamble.
- After the final answer, write one brief closing sentence, then end your response with:
  <assessment>One or two sentences: the user's current level and their main knowledge gaps.</assessment>
- Do NOT output <assessment> until you have asked and received at least 2 questions and 2 answers.
"""

_ASSESSMENT_RE = re.compile(r"<assessment>(.*?)</assessment>", re.DOTALL)


def run_diagnostic(
    title: str,
    domain: str,
    conversation: list[DiagnosticMessage],
) -> tuple[str, str | None]:
    """Call Gemini with the current conversation.

    Returns (visible_message, assessment_summary).
    assessment_summary is None when the diagnostic is still ongoing.
    """
    system = _SYSTEM.format(title=title, domain=domain)

    # Gemini requires the conversation to start with a user turn.
    # We inject a silent seed so the AI's first response becomes the opening
    # question without any visible user input.
    seed = {"role": "user", "parts": [{"text": "Start the diagnostic."}]}
    history = [seed] + [
        {"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content}]}
        for m in conversation
    ]

    response = _client.models.generate_content(
        model=settings.gemini_model,
        contents=history,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=512,
        ),
    )

    text = response.text
    match = _ASSESSMENT_RE.search(text)

    if match:
        summary = match.group(1).strip()
        visible = _ASSESSMENT_RE.sub("", text).strip()
        return visible or "Great — I now have a clear picture of your level!", summary

    return text.strip(), None
