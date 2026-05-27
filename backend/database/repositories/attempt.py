import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import Attempt
from backend.database.repositories.base import BaseRepository


class AttemptRepository(BaseRepository[Attempt, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Attempt)

    def list_by_session(self, session_id: uuid.UUID) -> list[Attempt]:
        return list(
            self.session.exec(
                select(Attempt).where(Attempt.session_id == session_id)
            ).all()
        )

    def list_by_question(self, question_id: uuid.UUID) -> list[Attempt]:
        return list(
            self.session.exec(
                select(Attempt).where(Attempt.question_id == question_id)
            ).all()
        )

    def get_by_session_and_question(
        self, session_id: uuid.UUID, question_id: uuid.UUID
    ) -> Optional[Attempt]:
        return self.session.exec(
            select(Attempt).where(
                Attempt.session_id == session_id,
                Attempt.question_id == question_id,
            )
        ).first()
