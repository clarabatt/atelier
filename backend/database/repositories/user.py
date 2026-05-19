import uuid
from typing import Optional

from sqlmodel import Session, select

from backend.database.models import User
from backend.database.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, uuid.UUID]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, User)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.session.exec(select(User).where(User.email == email)).first()

    def get_by_google_sub(self, sub: str) -> Optional[User]:
        return self.session.exec(select(User).where(User.google_sub == sub)).first()

    def get_active(self, user_id: uuid.UUID) -> Optional[User]:
        return self.session.exec(
            select(User).where(User.id == user_id, User.is_active == True)
        ).first()
