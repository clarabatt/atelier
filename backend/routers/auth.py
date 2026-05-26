import base64
import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from backend.auth import create_session_token
from backend.config import settings
from backend.database.models import OAuthState, User
from backend.database.session import get_session

router = APIRouter()

_SESSION_DAYS = 30
_ALLOWED_REDIRECT_PREFIXES = ("atelier://", "http://localhost", "https://localhost")


def _encode_state(rand: str, redirect_to: str) -> str:
    encoded = base64.urlsafe_b64encode(redirect_to.encode()).decode().rstrip("=")
    return f"{rand}.{encoded}"


def _decode_state(state: str) -> tuple[str, str]:
    """Returns (rand_part, redirect_to). redirect_to is empty if not encoded."""
    if "." not in state:
        return state, ""
    rand, encoded = state.split(".", 1)
    try:
        padding = (4 - len(encoded) % 4) % 4
        redirect_to = base64.urlsafe_b64decode(encoded + "=" * padding).decode()
        if not any(redirect_to.startswith(p) for p in _ALLOWED_REDIRECT_PREFIXES):
            return rand, ""
        return rand, redirect_to
    except Exception:
        return rand, ""


@router.get("/google/login")
async def google_login(redirect_to: str = "", db: Session = Depends(get_session)):
    rand = secrets.token_urlsafe(32)
    state = _encode_state(rand, redirect_to) if redirect_to else rand
    db.add(OAuthState(state=state, expires_at=datetime.utcnow() + timedelta(minutes=10)))
    db.commit()

    params = "&".join([
        f"client_id={settings.google_client_id}",
        f"redirect_uri={settings.google_redirect_uri}",
        "response_type=code",
        "scope=openid+email+profile",
        f"state={state}",
    ])
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_session),
):
    row = db.exec(
        select(OAuthState).where(
            OAuthState.state == state,
            OAuthState.expires_at > datetime.utcnow(),
        )
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    db.delete(row)
    db.commit()

    _, redirect_to = _decode_state(state)

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_resp.raise_for_status()
        info = userinfo_resp.json()

    now = datetime.utcnow()
    user = db.exec(select(User).where(User.google_sub == info["sub"])).first()

    if user:
        user.email = info["email"]
        user.display_name = info.get("name", "")
        user.picture_url = info.get("picture")
        user.last_login = now
    else:
        user = User(
            email=info["email"],
            google_sub=info["sub"],
            display_name=info.get("name", ""),
            picture_url=info.get("picture"),
            last_login=now,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_session_token(str(user.id))

    if redirect_to:
        return RedirectResponse(url=f"{redirect_to}?token={token}")

    response = RedirectResponse(url=settings.frontend_url)
    response.set_cookie(
        "session",
        token,
        httponly=True,
        samesite="lax",
        max_age=_SESSION_DAYS * 24 * 3600,
    )
    return response


@router.post("/logout")
async def logout():
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("session")
    return response
