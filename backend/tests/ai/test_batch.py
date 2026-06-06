from backend.ai.batch import _format_instruction


def test_format_instruction_single_format() -> None:
    assert _format_instruction(["mcq"]) == 'All questions must use format "mcq".'


def test_format_instruction_multiple_formats() -> None:
    result = _format_instruction(["mcq", "written"])
    assert result == 'Only use these formats: "mcq", "written". Distribute them roughly evenly.'
