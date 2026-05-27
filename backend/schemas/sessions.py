import uuid
from typing import Literal

from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    topic_id: uuid.UUID


class AttemptRequest(BaseModel):
    question_id: uuid.UUID
    user_answer: str
    status: Literal["correct", "wrong", "skipped"]


class GradeRequest(BaseModel):
    question_id: uuid.UUID
    user_answer: str
