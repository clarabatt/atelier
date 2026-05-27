import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import Batch, BatchStatus
from backend.database.repositories.base import BaseRepository


class BatchRepository(BaseRepository[Batch, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Batch)

    def list_by_topic(self, topic_id: uuid.UUID) -> list[Batch]:
        return list(
            self.session.exec(
                select(Batch).where(Batch.topic_id == topic_id).order_by(Batch.batch_number)
            ).all()
        )

    def get_active(self, topic_id: uuid.UUID) -> Optional[Batch]:
        return self.session.exec(
            select(Batch).where(
                Batch.topic_id == topic_id,
                Batch.status == BatchStatus.active,
            )
        ).first()

    def get_by_number(self, topic_id: uuid.UUID, batch_number: int) -> Optional[Batch]:
        return self.session.exec(
            select(Batch).where(
                Batch.topic_id == topic_id,
                Batch.batch_number == batch_number,
            )
        ).first()
