import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import StudySession
from backend.database.repositories.base import BaseRepository


class StudySessionRepository(BaseRepository[StudySession, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, StudySession)

    def list_by_user(self, user_id: uuid.UUID) -> list[StudySession]:
        return list(
            self.session.exec(
                select(StudySession).where(StudySession.user_id == user_id)
            ).all()
        )

    def list_by_batch(self, batch_id: uuid.UUID) -> list[StudySession]:
        return list(
            self.session.exec(
                select(StudySession).where(StudySession.batch_id == batch_id)
            ).all()
        )

    def get_open(self, user_id: uuid.UUID, batch_id: uuid.UUID) -> Optional[StudySession]:
        return self.session.exec(
            select(StudySession).where(
                StudySession.user_id == user_id,
                StudySession.batch_id == batch_id,
                StudySession.ended_at == None,  # noqa: E711
            )
        ).first()
