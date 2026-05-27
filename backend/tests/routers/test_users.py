import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.database.repositories import UserRepository
from backend.tests.factories import UserFactory


def _auth(session_cookie, user_id) -> dict:
    return {"Authorization": f"Bearer {session_cookie(str(user_id))}"}


def test_get_me_returns_user_data(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session, email="alice@test.com", display_name="Alice", picture_url="https://img.example.com/pic.jpg")
    r = client.get("/api/users/me", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    data = r.json()["user"]
    assert data["id"] == str(user.id)
    assert data["email"] == "alice@test.com"
    assert data["display_name"] == "Alice"
    assert data["picture_url"] == "https://img.example.com/pic.jpg"


def test_get_me_unauthenticated(client: TestClient) -> None:
    r = client.get("/api/users/me")
    assert r.status_code == 401


def test_get_me_invalid_token(client: TestClient) -> None:
    r = client.get("/api/users/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert r.status_code == 401


def test_get_me_inactive_user_rejected(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session, is_active=False)
    r = client.get("/api/users/me", headers=_auth(session_cookie, user.id))
    assert r.status_code == 401


def test_get_me_nonexistent_user_rejected(client: TestClient, session_cookie) -> None:
    r = client.get("/api/users/me", headers=_auth(session_cookie, uuid.uuid4()))
    assert r.status_code == 401
