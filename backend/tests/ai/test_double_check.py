from unittest.mock import MagicMock, patch

from backend.ai.double_check import ai_double_check


def _mock_response(text: str) -> MagicMock:
    r = MagicMock()
    r.text = text
    return r


def test_ai_double_check_confirmed():
    with patch("backend.ai.double_check._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "confirmed", "explanation": "The original verdict was correct."}'
        )
        result = ai_double_check("What is Python?", "A programming language", "A fruit", "wrong")
    assert result["verdict"] == "confirmed"
    assert result["explanation"] == "The original verdict was correct."


def test_ai_double_check_overridden():
    with patch("backend.ai.double_check._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "overridden", "explanation": "The student used a valid paraphrase."}'
        )
        result = ai_double_check("Q", "A", "student answer", "wrong")
    assert result["verdict"] == "overridden"


def test_ai_double_check_malformed_json_falls_back_to_confirmed():
    with patch("backend.ai.double_check._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response("not json")
        result = ai_double_check("Q", "A", "answer", "wrong")
    assert result["verdict"] == "confirmed"


def test_ai_double_check_invalid_verdict_falls_back_to_confirmed():
    with patch("backend.ai.double_check._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "maybe", "explanation": "Unsure."}'
        )
        result = ai_double_check("Q", "A", "answer", "correct")
    assert result["verdict"] == "confirmed"
