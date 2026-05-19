from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import OAuthState
from backend.database.repositories.base import BaseRepository


class OAuthStateRepository(BaseRepository[OAuthState, str]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, OAuthState)

    def is_valid(self, state: str) -> bool:
        record = self.session.exec(
            select(OAuthState).where(
                OAuthState.state == state,
                OAuthState.expires_at > datetime.utcnow(),
            )
        ).first()
        return record is not None

    def get_valid(self, state: str) -> Optional[OAuthState]:
        return self.session.exec(
            select(OAuthState).where(
                OAuthState.state == state,
                OAuthState.expires_at > datetime.utcnow(),
            )
        ).first()

    def delete_expired(self) -> int:
        expired = self.session.exec(
            select(OAuthState).where(OAuthState.expires_at <= datetime.utcnow())
        ).all()
        count = len(expired)
        for record in expired:
            self.session.delete(record)
        self.session.commit()
        return count
