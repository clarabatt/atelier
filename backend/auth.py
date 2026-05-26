from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
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


def _extract_token(
    session: Optional[str],
    authorization: Optional[str],
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization[len("Bearer "):]
    return session


def get_current_user(
    session: Optional[str] = Cookie(default=None, alias="session"),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_session),
) -> User:
    token = _extract_token(session, authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_session_token(token)
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    session: Optional[str] = Cookie(default=None, alias="session"),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_session),
) -> Optional[User]:
    token = _extract_token(session, authorization)
    if not token:
        return None
    try:
        return get_current_user(session=session, authorization=authorization, db=db)
    except HTTPException:
        return None
