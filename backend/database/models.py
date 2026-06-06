import uuid
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel


class TopicStatus(str, Enum):
    not_started = "not_started"
    active = "active"
    archived = "archived"


class BatchStatus(str, Enum):
    active = "active"
    completed = "completed"


class QuestionFormat(str, Enum):
    mcq = "mcq"
    written = "written"
    fill_blank = "fill_blank"


class AttemptStatus(str, Enum):
    correct = "correct"
    wrong = "wrong"
    skipped = "skipped"


class AiCheckVerdict(str, Enum):
    confirmed = "confirmed"
    overridden = "overridden"


class OAuthState(SQLModel, table=True):
    __tablename__ = "oauth_states"

    state: str = Field(primary_key=True)
    expires_at: datetime


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    google_sub: str = Field(unique=True, index=True)
    display_name: str
    picture_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = Field(default=True)

    topics: list["Topic"] = Relationship(back_populates="user")
    sessions: list["StudySession"] = Relationship(back_populates="user")
    attempts: list["Attempt"] = Relationship(back_populates="user")
    topic_stats: list["TopicStats"] = Relationship(back_populates="user")


class Topic(SQLModel, table=True):
    __tablename__ = "topics"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    title: str
    domain: str
    ai_level_summary: Optional[str] = None
    status: TopicStatus = Field(default=TopicStatus.not_started)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="topics")
    batches: list["Batch"] = Relationship(back_populates="topic")
    topic_stats: list["TopicStats"] = Relationship(back_populates="topic")


class Batch(SQLModel, table=True):
    __tablename__ = "batches"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    topic_id: uuid.UUID = Field(foreign_key="topics.id")
    batch_number: int
    status: BatchStatus = Field(default=BatchStatus.active)
    threshold_pct: int = Field(default=80)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    topic: Optional[Topic] = Relationship(back_populates="batches")
    questions: list["Question"] = Relationship(back_populates="batch")
    sessions: list["StudySession"] = Relationship(back_populates="batch")


class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    batch_id: uuid.UUID = Field(foreign_key="batches.id")
    body: str
    format: QuestionFormat
    options: Optional[List[Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    correct_answer: str
    reasoning: str
    difficulty: int
    position: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    batch: Optional[Batch] = Relationship(back_populates="questions")
    attempts: list["Attempt"] = Relationship(back_populates="question")


class StudySession(SQLModel, table=True):
    __tablename__ = "sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    batch_id: uuid.UUID = Field(foreign_key="batches.id")
    correct_count: int = Field(default=0)
    wrong_count: int = Field(default=0)
    skipped_count: int = Field(default=0)
    skipped_queue: List[Any] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    user: Optional[User] = Relationship(back_populates="sessions")
    batch: Optional[Batch] = Relationship(back_populates="sessions")
    attempts: list["Attempt"] = Relationship(back_populates="session")


class Attempt(SQLModel, table=True):
    __tablename__ = "attempts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    question_id: uuid.UUID = Field(foreign_key="questions.id")
    session_id: uuid.UUID = Field(foreign_key="sessions.id")
    user_answer: Optional[str] = None
    status: AttemptStatus
    ai_check_requested: bool = Field(default=False)
    ai_check_verdict: Optional[AiCheckVerdict] = None
    ai_check_explanation: Optional[str] = None
    answered_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="attempts")
    question: Optional[Question] = Relationship(back_populates="attempts")
    session: Optional[StudySession] = Relationship(back_populates="attempts")


class TopicStats(SQLModel, table=True):
    __tablename__ = "topic_stats"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    topic_id: uuid.UUID = Field(foreign_key="topics.id")
    accuracy_pct: float = Field(default=0.0)
    total_answered: int = Field(default=0)
    total_skipped: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity_at: Optional[datetime] = None

    user: Optional[User] = Relationship(back_populates="topic_stats")
    topic: Optional[Topic] = Relationship(back_populates="topic_stats")
