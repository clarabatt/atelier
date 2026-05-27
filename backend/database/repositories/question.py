import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import Question
from backend.database.repositories.base import BaseRepository


class QuestionRepository(BaseRepository[Question, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Question)

    def list_by_batch(self, batch_id: uuid.UUID) -> list[Question]:
        return list(
            self.session.exec(
                select(Question)
                .where(Question.batch_id == batch_id)
                .order_by(Question.position)
            ).all()
        )

    def get_by_batch_and_position(self, batch_id: uuid.UUID, position: int) -> Optional[Question]:
        return self.session.exec(
            select(Question).where(
                Question.batch_id == batch_id,
                Question.position == position,
            )
        ).first()
