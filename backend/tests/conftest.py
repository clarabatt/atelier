import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, text

from backend.auth import create_session_token
from backend.database import models as _models  # noqa: F401 — registers all SQLModel tables
from backend.database.session import get_session
from backend.main import app

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://atelier:atelier@localhost:5434/atelier_test",
)

engine = create_engine(TEST_DATABASE_URL)


@pytest.fixture(scope="session", autouse=True)
def create_schema():
    SQLModel.metadata.create_all(engine)
    yield
    table_names = ", ".join(f'"{t.name}"' for t in SQLModel.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {table_names} CASCADE"))


@pytest.fixture(autouse=True)
def clean_tables():
    table_names = ", ".join(f'"{t.name}"' for t in SQLModel.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {table_names} CASCADE"))
    yield


@pytest.fixture
def session() -> Generator[Session, None, None]:
    with Session(engine) as s:
        yield s


@pytest.fixture
def client(session: Session) -> Generator[TestClient, None, None]:
    def override_get_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.pop(get_session, None)


@pytest.fixture
def session_cookie():
    def _make(user_id: str) -> str:
        return create_session_token(user_id)
    return _make
