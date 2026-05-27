from datetime import datetime, timedelta

import httpx
import respx
from sqlmodel import Session

from backend.database.models import OAuthState, User
from backend.routers.auth import _decode_state, _encode_state
from backend.tests.factories import UserFactory


# ---------------------------------------------------------------------------
# Pure function unit tests
# ---------------------------------------------------------------------------

def test_encode_decode_state_roundtrip() -> None:
    rand = "abc123"
    redirect = "atelier://callback"
    state = _encode_state(rand, redirect)
    decoded_rand, decoded_redirect = _decode_state(state)
    assert decoded_rand == rand
    assert decoded_redirect == redirect


def test_decode_state_without_dot() -> None:
    rand, redirect = _decode_state("simple-state")
    assert rand == "simple-state"
    assert redirect == ""


def test_decode_state_rejects_unsafe_redirect() -> None:
    rand = "abc"
    bad_redirect = "https://evil.com/steal"
    state = _encode_state(rand, bad_redirect)
    _, redirect = _decode_state(state)
    assert redirect == ""


def test_decode_state_allows_localhost_redirect() -> None:
    rand = "abc"
    redirect = "http://localhost:3000/callback"
    state = _encode_state(rand, redirect)
    _, decoded = _decode_state(state)
    assert decoded == redirect


def test_decode_state_allows_atelier_scheme() -> None:
    rand = "abc"
    redirect = "atelier://auth/callback"
    state = _encode_state(rand, redirect)
    _, decoded = _decode_state(state)
    assert decoded == redirect


# ---------------------------------------------------------------------------
# /auth/google/login
# ---------------------------------------------------------------------------

def test_google_login_redirects_to_google(client) -> None:
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code in (302, 307)
    location = r.headers["location"]
    assert "accounts.google.com" in location
    assert "response_type=code" in location


def test_google_login_stores_state_in_db(client, session: Session) -> None:
    client.get("/auth/google/login", follow_redirects=False)
    count = len(session.exec(__import__("sqlmodel").select(OAuthState)).all())
    assert count == 1


def test_google_login_with_redirect_to_encodes_it(client, session: Session) -> None:
    r = client.get(
        "/auth/google/login?redirect_to=atelier://auth",
        follow_redirects=False,
    )
    location = r.headers["location"]
    assert "state=" in location
    state_param = [p for p in location.split("&") if p.startswith("state=")][0]
    state_value = state_param.split("=", 1)[1]
    assert "." in state_value  # rand.base64(redirect)


# ---------------------------------------------------------------------------
# /auth/google/callback
# ---------------------------------------------------------------------------

def _insert_state(session: Session, state: str, minutes_valid: int = 5) -> None:
    session.add(OAuthState(state=state, expires_at=datetime.utcnow() + timedelta(minutes=minutes_valid)))
    session.commit()


def test_google_callback_invalid_state_returns_400(client, session: Session) -> None:
    r = client.get("/auth/google/callback?code=abc&state=nonexistent", follow_redirects=False)
    assert r.status_code == 400


def test_google_callback_expired_state_returns_400(client, session: Session) -> None:
    _insert_state(session, "expiredstate", minutes_valid=-1)
    r = client.get("/auth/google/callback?code=abc&state=expiredstate", follow_redirects=False)
    assert r.status_code == 400


@respx.mock
def test_google_callback_creates_new_user(client, session: Session) -> None:
    state = "validstate123"
    _insert_state(session, state)

    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "fake-access-token"})
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").mock(
        return_value=httpx.Response(200, json={
            "sub": "google-sub-new",
            "email": "newuser@gmail.com",
            "name": "New User",
            "picture": "https://example.com/pic.jpg",
        })
    )

    r = client.get(f"/auth/google/callback?code=authcode&state={state}", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert "session=" in r.headers.get("set-cookie", "")

    from sqlmodel import select
    user = session.exec(select(User).where(User.google_sub == "google-sub-new")).first()
    assert user is not None
    assert user.email == "newuser@gmail.com"


@respx.mock
def test_google_callback_updates_existing_user(client, session: Session) -> None:
    state = "updatestate456"
    _insert_state(session, state)

    existing = UserFactory.create(session, email="old@gmail.com", google_sub="google-sub-existing", display_name="Old Name")

    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "fake-token"})
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").mock(
        return_value=httpx.Response(200, json={
            "sub": "google-sub-existing",
            "email": "updated@gmail.com",
            "name": "Updated Name",
        })
    )

    r = client.get(f"/auth/google/callback?code=authcode&state={state}", follow_redirects=False)
    assert r.status_code in (302, 307)

    session.refresh(existing)
    assert existing.email == "updated@gmail.com"
    assert existing.display_name == "Updated Name"


@respx.mock
def test_google_callback_with_redirect_to_returns_token_in_url(client, session: Session) -> None:
    redirect = "atelier://auth/callback"
    rand = "myrand"
    state = _encode_state(rand, redirect)
    _insert_state(session, state)

    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "tok"})
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").mock(
        return_value=httpx.Response(200, json={
            "sub": "google-sub-mobile",
            "email": "mobile@gmail.com",
            "name": "Mobile User",
        })
    )

    r = client.get(f"/auth/google/callback?code=code&state={state}", follow_redirects=False)
    assert r.status_code in (302, 307)
    location = r.headers["location"]
    assert location.startswith("atelier://auth/callback")
    assert "token=" in location


@respx.mock
def test_google_callback_deletes_used_state(client, session: Session) -> None:
    from sqlmodel import select
    state = "consumedstate"
    _insert_state(session, state)

    respx.post("https://oauth2.googleapis.com/token").mock(
        return_value=httpx.Response(200, json={"access_token": "tok"})
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").mock(
        return_value=httpx.Response(200, json={
            "sub": "google-sub-once",
            "email": "once@gmail.com",
            "name": "Once User",
        })
    )

    client.get(f"/auth/google/callback?code=c&state={state}", follow_redirects=False)

    remaining = session.exec(select(OAuthState).where(OAuthState.state == state)).first()
    assert remaining is None


# ---------------------------------------------------------------------------
# /auth/logout
# ---------------------------------------------------------------------------

def test_logout_redirects_and_deletes_cookie(client) -> None:
    r = client.post("/auth/logout", follow_redirects=False)
    assert r.status_code in (302, 307)
    set_cookie = r.headers.get("set-cookie", "")
    assert "session=" in set_cookie
    # Cookie deleted: max-age=0 or expires in the past
    assert "max-age=0" in set_cookie.lower() or 'session=""' in set_cookie.lower()
