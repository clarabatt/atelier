import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import Topic
from backend.database.repositories.base import BaseRepository


class TopicRepository(BaseRepository[Topic, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Topic)

    def list_by_user(self, user_id: uuid.UUID) -> list[Topic]:
        return list(
            self.session.exec(select(Topic).where(Topic.user_id == user_id)).all()
        )

    def get_by_user_and_id(self, user_id: uuid.UUID, topic_id: uuid.UUID) -> Optional[Topic]:
        return self.session.exec(
            select(Topic).where(Topic.id == topic_id, Topic.user_id == user_id)
        ).first()
