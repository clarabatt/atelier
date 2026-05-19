from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from backend.config import settings
from backend.database.models import User
from backend.database.session import get_session

_ALGORITHM = "HS256"
_SESSION_DAYS = 30


def create_session_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=_SESSION_DAYS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def decode_session_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")


def get_current_user(
    session: str = Cookie(default=None, alias="session"),
    db: Session = Depends(get_session),
) -> User:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_session_token(session)
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    session: Optional[str] = Cookie(default=None, alias="session"),
    db: Session = Depends(get_session),
) -> Optional[User]:
    if not session:
        return None
    try:
        return get_current_user(session=session, db=db)
    except HTTPException:
        return None
