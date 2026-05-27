import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.database.repositories import TopicRepository
from backend.tests.factories import BatchFactory, QuestionFactory, TopicFactory, UserFactory


def _auth(session_cookie, user_id) -> dict:
    return {"Authorization": f"Bearer {session_cookie(str(user_id))}"}


def _fake_questions(n: int = 5) -> list[dict]:
    return [
        {
            "body": f"Question {i}?",
            "format": "mcq",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "reasoning": "Because A.",
            "difficulty": 3,
        }
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# List topics
# ---------------------------------------------------------------------------

def test_list_topics_empty(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    assert r.json() == {"topics": []}


def test_list_topics_returns_own(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id, title="Python")
    TopicFactory.create(session, user.id, title="SQL")
    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    titles = {t["title"] for t in r.json()["topics"]}
    assert titles == {"Python", "SQL"}


def test_list_topics_does_not_leak_other_users(client: TestClient, session: Session, session_cookie) -> None:
    owner = UserFactory.create(session)
    requester = UserFactory.create(session)
    TopicFactory.create(session, owner.id, title="Private Topic")
    r = client.get("/api/topics", headers=_auth(session_cookie, requester.id))
    assert r.json()["topics"] == []


def test_list_topics_unauthenticated(client: TestClient) -> None:
    r = client.get("/api/topics")
    assert r.status_code == 401


def test_list_topics_includes_accuracy(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id)
    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    topic = r.json()["topics"][0]
    assert "accuracy_pct" in topic
    assert topic["accuracy_pct"] == 0.0


# ---------------------------------------------------------------------------
# Get topic
# ---------------------------------------------------------------------------

def test_get_topic_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, title="Python", domain="Programming")
    r = client.get(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    data = r.json()["topic"]
    assert data["id"] == str(topic.id)
    assert data["title"] == "Python"
    assert data["domain"] == "Programming"


def test_get_topic_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.get(f"/api/topics/{uuid.uuid4()}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_get_topic_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    owner = UserFactory.create(session)
    requester = UserFactory.create(session)
    topic = TopicFactory.create(session, owner.id)
    r = client.get(f"/api/topics/{topic.id}", headers=_auth(session_cookie, requester.id))
    assert r.status_code == 404


def test_get_topic_has_batch_flag_true(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="beginner level")
    BatchFactory.create(session, topic.id)
    r = client.get(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert r.json()["topic"]["has_batch"] is True


def test_get_topic_has_batch_flag_false(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.get(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert r.json()["topic"]["has_batch"] is False


# ---------------------------------------------------------------------------
# Create topic
# ---------------------------------------------------------------------------

def test_create_topic_without_level(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(
        "/api/topics",
        json={"title": "Python", "domain": "Programming"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 201
    data = r.json()["topic"]
    assert data["title"] == "Python"
    assert data["domain"] == "Programming"
    assert data["ai_level_summary"] is None


def test_create_topic_with_level_sets_summary(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    with patch("backend.routers.topics.generate_batch", return_value=_fake_questions()):
        r = client.post(
            "/api/topics",
            json={"title": "Python", "domain": "Programming", "initial_level": "beginner"},
            headers=_auth(session_cookie, user.id),
        )
    assert r.status_code == 201
    topic_id = uuid.UUID(r.json()["topic"]["id"])
    topic = TopicRepository(session).get_by_id(topic_id)
    assert topic.ai_level_summary is not None


def test_create_topic_batch_failure_does_not_block_creation(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    with patch("backend.routers.topics.generate_batch", side_effect=RuntimeError("AI down")):
        r = client.post(
            "/api/topics",
            json={"title": "Python", "domain": "Programming", "initial_level": "advanced"},
            headers=_auth(session_cookie, user.id),
        )
    assert r.status_code == 201
    topic_id = uuid.UUID(r.json()["topic"]["id"])
    topic = TopicRepository(session).get_by_id(topic_id)
    assert topic.ai_level_summary is not None


def test_create_topic_blank_title_rejected(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(
        "/api/topics",
        json={"title": "   ", "domain": "Programming"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 422


def test_create_topic_blank_domain_rejected(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(
        "/api/topics",
        json={"title": "Python", "domain": ""},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 422


def test_create_topic_unauthenticated(client: TestClient) -> None:
    r = client.post("/api/topics", json={"title": "Python", "domain": "Programming"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Create batch
# ---------------------------------------------------------------------------

def test_create_batch_topic_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(f"/api/topics/{uuid.uuid4()}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_create_batch_no_diagnostic_returns_400(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 400
    assert "diagnostic" in r.json()["detail"].lower()


def test_create_batch_returns_existing_when_has_questions(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="beginner level")
    batch = BatchFactory.create(session, topic.id)
    QuestionFactory.create(session, batch.id)
    r = client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 201
    assert r.json()["batch_id"] == str(batch.id)


def test_create_batch_replaces_empty_batch(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="intermediate level")
    old_batch = BatchFactory.create(session, topic.id)
    with patch("backend.routers.topics.generate_batch", return_value=_fake_questions()):
        r = client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 201
    assert r.json()["batch_id"] != str(old_batch.id)


def test_create_batch_ai_error_returns_503(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="intermediate level")
    with patch("backend.routers.topics.generate_batch", side_effect=RuntimeError("AI unavailable")):
        r = client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 503


def test_create_batch_success(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="advanced level")
    with patch("backend.routers.topics.generate_batch", return_value=_fake_questions(20)):
        r = client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))
    assert r.status_code == 201
    assert uuid.UUID(r.json()["batch_id"])


# ---------------------------------------------------------------------------
# Diagnostic
# ---------------------------------------------------------------------------

def test_diagnostic_no_gemini_key(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    with patch("backend.routers.topics.settings") as mock_s:
        mock_s.gemini_api_key = ""
        r = client.post(
            f"/api/topics/{topic.id}/diagnostic",
            json={"conversation": []},
            headers=_auth(session_cookie, user.id),
        )
    assert r.status_code == 503


def test_diagnostic_topic_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    with patch("backend.routers.topics.settings") as mock_s:
        mock_s.gemini_api_key = "fake-key"
        r = client.post(
            f"/api/topics/{uuid.uuid4()}/diagnostic",
            json={"conversation": []},
            headers=_auth(session_cookie, user.id),
        )
    assert r.status_code == 404


def test_diagnostic_ongoing_returns_not_final(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    with patch("backend.routers.topics.settings") as mock_s:
        mock_s.gemini_api_key = "fake-key"
        with patch("backend.routers.topics.run_diagnostic", return_value=("What is a list?", None)):
            r = client.post(
                f"/api/topics/{topic.id}/diagnostic",
                json={"conversation": []},
                headers=_auth(session_cookie, user.id),
            )
    assert r.status_code == 200
    assert r.json() == {"message": "What is a list?", "is_final": False}


def test_diagnostic_final_saves_summary_and_triggers_batch(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    summary = "Intermediate: knows basic syntax, gaps in OOP."
    with patch("backend.routers.topics.settings") as mock_s:
        mock_s.gemini_api_key = "fake-key"
        with patch("backend.routers.topics.run_diagnostic", return_value=("Great work!", summary)):
            with patch("backend.routers.topics.generate_batch", return_value=_fake_questions()):
                r = client.post(
                    f"/api/topics/{topic.id}/diagnostic",
                    json={"conversation": [{"role": "user", "content": "I know some basics."}]},
                    headers=_auth(session_cookie, user.id),
                )
    assert r.status_code == 200
    body = r.json()
    assert body["is_final"] is True
    assert "Great work!" in body["message"]
    saved = TopicRepository(session).get_by_id(topic.id)
    assert saved.ai_level_summary == summary


def test_diagnostic_ai_error_returns_503(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    with patch("backend.routers.topics.settings") as mock_s:
        mock_s.gemini_api_key = "fake-key"
        with patch("backend.routers.topics.run_diagnostic", side_effect=RuntimeError("Gemini down")):
            r = client.post(
                f"/api/topics/{topic.id}/diagnostic",
                json={"conversation": []},
                headers=_auth(session_cookie, user.id),
            )
    assert r.status_code == 503


# ---------------------------------------------------------------------------
# Patch topic (archive / unarchive) — AT-027
# ---------------------------------------------------------------------------

def test_patch_topic_archive(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)

    r = client.patch(
        f"/api/topics/{topic.id}",
        json={"status": "archived"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "archived"

    persisted = TopicRepository(session).get_by_id(topic.id)
    assert persisted.status.value == "archived"


def test_patch_topic_archived_hidden_from_default_list(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id, title="Active Topic")
    archived = TopicFactory.create(session, user.id, title="Archived Topic")

    client.patch(
        f"/api/topics/{archived.id}",
        json={"status": "archived"},
        headers=_auth(session_cookie, user.id),
    )

    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    titles = {t["title"] for t in r.json()["topics"]}
    assert "Active Topic" in titles
    assert "Archived Topic" not in titles


def test_patch_topic_include_archived_returns_all(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id, title="Active")
    archived = TopicFactory.create(session, user.id, title="Archived")

    client.patch(
        f"/api/topics/{archived.id}",
        json={"status": "archived"},
        headers=_auth(session_cookie, user.id),
    )

    r = client.get("/api/topics?include_archived=true", headers=_auth(session_cookie, user.id))
    titles = {t["title"] for t in r.json()["topics"]}
    assert "Active" in titles
    assert "Archived" in titles


def test_patch_topic_unarchive_returns_to_list(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, title="My Topic")

    client.patch(f"/api/topics/{topic.id}", json={"status": "archived"}, headers=_auth(session_cookie, user.id))
    client.patch(f"/api/topics/{topic.id}", json={"status": "active"}, headers=_auth(session_cookie, user.id))

    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    titles = [t["title"] for t in r.json()["topics"]]
    assert "My Topic" in titles


def test_patch_topic_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    owner = UserFactory.create(session)
    requester = UserFactory.create(session)
    topic = TopicFactory.create(session, owner.id)

    r = client.patch(
        f"/api/topics/{topic.id}",
        json={"status": "archived"},
        headers=_auth(session_cookie, requester.id),
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Delete topic permanently — AT-028
# ---------------------------------------------------------------------------

def test_delete_topic_returns_204(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)

    r = client.delete(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 204


def test_delete_topic_removes_from_db(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)

    client.delete(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))

    assert TopicRepository(session).get_by_id(topic.id) is None


def test_delete_topic_cascades_batches_and_questions(client: TestClient, session: Session, session_cookie) -> None:
    from backend.database.repositories import BatchRepository

    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    QuestionFactory.create(session, batch.id)

    client.delete(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))

    assert BatchRepository(session).get_by_id(batch.id) is None


def test_delete_topic_cascades_sessions_and_attempts(client: TestClient, session: Session, session_cookie) -> None:
    from backend.database.models import Attempt, AttemptStatus
    from backend.database.repositories import StudySessionRepository
    from backend.tests.factories import StudySessionFactory

    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    question = QuestionFactory.create(session, batch.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id)
    attempt = Attempt(
        user_id=user.id, question_id=question.id, session_id=study_session.id, status=AttemptStatus.correct
    )
    session.add(attempt)
    session.commit()

    client.delete(f"/api/topics/{topic.id}", headers=_auth(session_cookie, user.id))

    assert StudySessionRepository(session).get_by_id(study_session.id) is None


def test_delete_topic_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.delete(f"/api/topics/{uuid.uuid4()}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_delete_topic_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    owner = UserFactory.create(session)
    requester = UserFactory.create(session)
    topic = TopicFactory.create(session, owner.id)

    r = client.delete(f"/api/topics/{topic.id}", headers=_auth(session_cookie, requester.id))
    assert r.status_code == 404
    assert TopicRepository(session).get_by_id(topic.id) is not None


# ---------------------------------------------------------------------------
# not_started status — AT-0002
# ---------------------------------------------------------------------------

def test_new_topic_defaults_to_not_started(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)

    assert topic.status.value == "not_started"

    r = client.get("/api/topics", headers=_auth(session_cookie, user.id))
    ids = [t["id"] for t in r.json()["topics"]]
    assert str(topic.id) in ids


def test_batch_creation_transitions_topic_to_active(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="Beginner level")

    with patch("backend.routers.topics.generate_batch", return_value=_fake_questions()):
        client.post(f"/api/topics/{topic.id}/batches", headers=_auth(session_cookie, user.id))

    persisted = TopicRepository(session).get_by_id(topic.id)
    assert persisted.status.value == "active"
