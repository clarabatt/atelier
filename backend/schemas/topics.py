from typing import Literal, Optional

from pydantic import BaseModel, field_validator

Level = Literal["beginner", "intermediate", "advanced"]

_LEVEL_SUMMARIES: dict[str, str] = {
    "beginner": "Self-assessed as a beginner — new to this topic with little prior knowledge.",
    "intermediate": "Self-assessed as intermediate — familiar with the basics but still building deeper understanding.",
    "advanced": "Self-assessed as advanced — confident with the fundamentals and ready to tackle harder material.",
}


class NewTopicRequest(BaseModel):
    title: str
    domain: str
    initial_level: Optional[Level] = None

    @field_validator("title", "domain")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    def level_summary(self) -> Optional[str]:
        if self.initial_level is None:
            return None
        return _LEVEL_SUMMARIES[self.initial_level]


class DiagnosticMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class DiagnosticRequest(BaseModel):
    conversation: list[DiagnosticMessage]
