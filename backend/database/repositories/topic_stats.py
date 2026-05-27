import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import TopicStats
from backend.database.repositories.base import BaseRepository


class TopicStatsRepository(BaseRepository[TopicStats, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, TopicStats)

    def list_by_user(self, user_id: uuid.UUID) -> list[TopicStats]:
        return list(
            self.session.exec(
                select(TopicStats).where(TopicStats.user_id == user_id)
            ).all()
        )

    def get_by_user_and_topic(
        self, user_id: uuid.UUID, topic_id: uuid.UUID
    ) -> Optional[TopicStats]:
        return self.session.exec(
            select(TopicStats).where(
                TopicStats.user_id == user_id,
                TopicStats.topic_id == topic_id,
            )
        ).first()
