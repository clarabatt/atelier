from unittest.mock import MagicMock, patch

from backend.ai.grader import grade_written


def _mock_response(text: str) -> MagicMock:
    r = MagicMock()
    r.text = text
    return r


def test_grade_correct_verdict():
    with patch("backend.ai.grader._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "correct", "explanation": "Good paraphrase of the concept."}'
        )
        result = grade_written("What is a variable?", "A named storage location", "A name for a memory slot")
    assert result["verdict"] == "correct"
    assert result["explanation"] == "Good paraphrase of the concept."


def test_grade_wrong_verdict():
    with patch("backend.ai.grader._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "wrong", "explanation": "Does not address the question."}'
        )
        result = grade_written("What is a variable?", "A named storage location", "A type of loop")
    assert result["verdict"] == "wrong"


def test_grade_partial_verdict():
    with patch("backend.ai.grader._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "partial", "explanation": "Correct but incomplete."}'
        )
        result = grade_written("What is a variable?", "A named storage location in memory", "A named location")
    assert result["verdict"] == "partial"
    assert "incomplete" in result["explanation"]


def test_grade_malformed_json_retries_and_returns_wrong():
    with patch("backend.ai.grader._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response("not json at all")
        result = grade_written("Q", "A", "student answer")
    assert result["verdict"] == "wrong"
    assert mock_client.models.generate_content.call_count == 2


def test_grade_malformed_json_retries_and_succeeds():
    with patch("backend.ai.grader._client") as mock_client:
        good_response = _mock_response('{"verdict": "correct", "explanation": "Good."}')
        bad_response = _mock_response("oops not json")
        mock_client.models.generate_content.side_effect = [bad_response, good_response]
        result = grade_written("Q", "A", "student answer")
    assert result["verdict"] == "correct"
    assert mock_client.models.generate_content.call_count == 2


def test_grade_invalid_verdict_field_falls_back():
    with patch("backend.ai.grader._client") as mock_client:
        mock_client.models.generate_content.return_value = _mock_response(
            '{"verdict": "maybe", "explanation": "Hmm."}'
        )
        result = grade_written("Q", "A", "student answer")
    assert result["verdict"] == "wrong"
