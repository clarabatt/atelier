import uuid
from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from unittest.mock import patch

from backend.database.models import Attempt, AttemptStatus, BatchStatus, TopicStats
from backend.database.repositories import (
    AttemptRepository,
    BatchRepository,
    StudySessionRepository,
    TopicStatsRepository,
)
from backend.tests.factories import (
    BatchFactory,
    QuestionFactory,
    StudySessionFactory,
    TopicFactory,
    UserFactory,
)


def _auth(session_cookie, user_id) -> dict:
    return {"Authorization": f"Bearer {session_cookie(str(user_id))}"}


def _setup(session: Session):
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    question = QuestionFactory.create(session, batch.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id)
    return user, question, study_session


# ---------------------------------------------------------------------------
# Start session
# ---------------------------------------------------------------------------

def test_start_session_topic_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post("/api/sessions", json={"topic_id": str(uuid.uuid4())}, headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_start_session_no_active_batch(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.post("/api/sessions", json={"topic_id": str(topic.id)}, headers=_auth(session_cookie, user.id))
    assert r.status_code == 404
    assert "batch" in r.json()["detail"].lower()


def test_start_session_creates_new_session(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    QuestionFactory.create(session, batch.id, position=1)
    QuestionFactory.create(session, batch.id, position=2)

    r = client.post("/api/sessions", json={"topic_id": str(topic.id)}, headers=_auth(session_cookie, user.id))
    assert r.status_code == 201
    body = r.json()
    assert uuid.UUID(body["session_id"])
    assert len(body["questions"]) == 2
    assert body["correct_count"] == 0
    assert body["wrong_count"] == 0
    assert body["skipped_count"] == 0


def test_start_session_returns_existing_open_session(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    QuestionFactory.create(session, batch.id)
    existing = StudySessionFactory.create(session, user.id, batch.id)

    r = client.post("/api/sessions", json={"topic_id": str(topic.id)}, headers=_auth(session_cookie, user.id))
    assert r.status_code == 201
    assert r.json()["session_id"] == str(existing.id)


def test_start_session_marks_answered_questions(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    q1 = QuestionFactory.create(session, batch.id, position=1)
    q2 = QuestionFactory.create(session, batch.id, position=2)
    study_session = StudySessionFactory.create(session, user.id, batch.id)

    attempt = Attempt(user_id=user.id, question_id=q1.id, session_id=study_session.id, status=AttemptStatus.correct)
    session.add(attempt)
    session.commit()

    r = client.post("/api/sessions", json={"topic_id": str(topic.id)}, headers=_auth(session_cookie, user.id))
    questions = {q["id"]: q for q in r.json()["questions"]}
    assert questions[str(q1.id)]["answered"] is True
    assert questions[str(q2.id)]["answered"] is False


def test_start_session_unauthenticated(client: TestClient, session: Session) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.post("/api/sessions", json={"topic_id": str(topic.id)})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Record attempt
# ---------------------------------------------------------------------------

def test_record_attempt_correct_increments_count(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session = _setup(session)
    r = client.post(
        f"/api/sessions/{study_session.id}/attempts",
        json={"question_id": str(question.id), "user_answer": "A", "status": "correct"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 200
    assert uuid.UUID(r.json()["attempt_id"])
    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.correct_count == 1
    assert persisted.wrong_count == 0


def test_record_attempt_wrong_increments_count(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session = _setup(session)
    client.post(
        f"/api/sessions/{study_session.id}/attempts",
        json={"question_id": str(question.id), "user_answer": "B", "status": "wrong"},
        headers=_auth(session_cookie, user.id),
    )
    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.wrong_count == 1
    assert persisted.correct_count == 0


def test_record_attempt_skipped_increments_count(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session = _setup(session)
    client.post(
        f"/api/sessions/{study_session.id}/attempts",
        json={"question_id": str(question.id), "user_answer": "", "status": "skipped"},
        headers=_auth(session_cookie, user.id),
    )
    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.skipped_count == 1


def test_record_attempt_duplicate_returns_existing(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session = _setup(session)
    headers = _auth(session_cookie, user.id)
    payload = {"question_id": str(question.id), "user_answer": "A", "status": "correct"}

    r1 = client.post(f"/api/sessions/{study_session.id}/attempts", json=payload, headers=headers)
    r2 = client.post(f"/api/sessions/{study_session.id}/attempts", json=payload, headers=headers)

    assert r2.status_code == 200
    assert r1.json()["attempt_id"] == r2.json()["attempt_id"]
    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.correct_count == 1  # not double-counted


def test_record_attempt_session_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(
        f"/api/sessions/{uuid.uuid4()}/attempts",
        json={"question_id": str(uuid.uuid4()), "user_answer": "A", "status": "correct"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 404


def test_record_attempt_on_completed_session_rejected(client: TestClient, session: Session, session_cookie) -> None:
    user, question, _ = _setup(session)
    batch = BatchFactory.create(session, TopicFactory.create(session, user.id).id)
    completed_session = StudySessionFactory.create(session, user.id, batch.id, ended_at=datetime.utcnow())

    r = client.post(
        f"/api/sessions/{completed_session.id}/attempts",
        json={"question_id": str(question.id), "user_answer": "A", "status": "correct"},
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 400


def test_record_attempt_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session = _setup(session)
    other_user = UserFactory.create(session)
    r = client.post(
        f"/api/sessions/{study_session.id}/attempts",
        json={"question_id": str(question.id), "user_answer": "A", "status": "correct"},
        headers=_auth(session_cookie, other_user.id),
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Complete session
# ---------------------------------------------------------------------------

def test_complete_session_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(f"/api/sessions/{uuid.uuid4()}/complete", headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_complete_session_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    user, _, study_session = _setup(session)
    other_user = UserFactory.create(session)
    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, other_user.id))
    assert r.status_code == 404


def test_complete_session_returns_summary(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=7, wrong_count=3, skipped_count=1)

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    body = r.json()
    assert body["correct"] == 7
    assert body["wrong"] == 3
    assert body["skipped"] == 1
    assert body["accuracy_pct"] == 70


def test_complete_session_sets_ended_at(client: TestClient, session: Session, session_cookie) -> None:
    user, _, study_session = _setup(session)
    client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.ended_at is not None


def test_complete_session_creates_topic_stats(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=4, wrong_count=1)

    client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))

    stats = TopicStatsRepository(session).get_by_user_and_topic(user.id, batch.topic_id)
    assert stats is not None
    assert stats.total_answered == 5
    assert stats.accuracy_pct == 80.0


def test_complete_session_idempotent(client: TestClient, session: Session, session_cookie) -> None:
    user, _, study_session = _setup(session)

    r1 = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    r2 = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json() == r2.json()


def test_complete_session_updates_existing_stats(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=6, wrong_count=4)

    existing_stats = TopicStats(
        user_id=user.id,
        topic_id=batch.topic_id,
        accuracy_pct=50.0,
        total_answered=10,
        total_skipped=2,
    )
    session.add(existing_stats)
    session.commit()

    client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))

    stats = TopicStatsRepository(session).get_by_user_and_topic(user.id, batch.topic_id)
    assert stats.total_answered == 20
    assert stats.accuracy_pct == 60.0


# ---------------------------------------------------------------------------
# AI double-check (AT-018, AT-019)
# ---------------------------------------------------------------------------

def _ai_check_patch(verdict: str, explanation: str = "Re-check explanation."):
    return patch(
        "backend.routers.sessions.ai_double_check",  # noqa: F821 — patched dynamically via local import
        return_value={"verdict": verdict, "explanation": explanation},
    )


def _setup_attempt(session: Session, status: AttemptStatus):
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    question = QuestionFactory.create(session, batch.id)
    study_session = StudySessionFactory.create(
        session, user.id, batch.id,
        correct_count=1 if status == AttemptStatus.correct else 0,
        wrong_count=1 if status == AttemptStatus.wrong else 0,
    )
    attempt = Attempt(
        user_id=user.id,
        question_id=question.id,
        session_id=study_session.id,
        user_answer="student answer",
        status=status,
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return user, question, study_session, attempt


def test_ai_check_confirmed_does_not_change_counts(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    url = f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check"

    with patch("backend.ai.double_check.ai_double_check",
               return_value={"verdict": "confirmed", "explanation": "Stands."}):
        r = client.post(url, headers=_auth(session_cookie, user.id))

    assert r.status_code == 200
    body = r.json()
    assert body["verdict"] == "confirmed"
    assert body["explanation"] == "Stands."

    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.wrong_count == 1
    assert persisted.correct_count == 0


def test_ai_check_overridden_updates_session_counts(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    url = f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check"

    with patch("backend.ai.double_check.ai_double_check",
               return_value={"verdict": "overridden", "explanation": "Valid paraphrase."}):
        r = client.post(url, headers=_auth(session_cookie, user.id))

    assert r.status_code == 200
    assert r.json()["verdict"] == "overridden"

    persisted = StudySessionRepository(session).get_by_id(study_session.id)
    assert persisted.correct_count == 1
    assert persisted.wrong_count == 0


def test_ai_check_stores_verdict_on_attempt(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    url = f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check"

    with patch("backend.ai.double_check.ai_double_check",
               return_value={"verdict": "overridden", "explanation": "Good answer."}):
        client.post(url, headers=_auth(session_cookie, user.id))

    persisted_attempt = AttemptRepository(session).get_by_id(attempt.id)
    assert persisted_attempt.ai_check_requested is True
    assert persisted_attempt.ai_check_verdict.value == "overridden"
    assert persisted_attempt.ai_check_explanation == "Good answer."


def test_ai_check_second_call_returns_409(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    url = f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check"

    with patch("backend.ai.double_check.ai_double_check",
               return_value={"verdict": "confirmed", "explanation": "Stands."}):
        client.post(url, headers=_auth(session_cookie, user.id))
        r2 = client.post(url, headers=_auth(session_cookie, user.id))

    assert r2.status_code == 409


def test_ai_check_session_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.post(
        f"/api/sessions/{uuid.uuid4()}/attempts/{uuid.uuid4()}/ai-check",
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 404


def test_ai_check_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    _, _, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    other_user = UserFactory.create(session)
    r = client.post(
        f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check",
        headers=_auth(session_cookie, other_user.id),
    )
    assert r.status_code == 404


def test_ai_check_attempt_not_in_session_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    user, question, study_session, attempt = _setup_attempt(session, AttemptStatus.wrong)
    other_topic = TopicFactory.create(session, user.id)
    other_batch = BatchFactory.create(session, other_topic.id)
    other_session = StudySessionFactory.create(session, user.id, other_batch.id)

    r = client.post(
        f"/api/sessions/{other_session.id}/attempts/{attempt.id}/ai-check",
        headers=_auth(session_cookie, user.id),
    )
    assert r.status_code == 404


def test_ai_check_override_at_threshold_triggers_next_batch(
    client: TestClient, session: Session, session_cookie
) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, ai_level_summary="intermediate")
    batch = BatchFactory.create(session, topic.id)
    question = QuestionFactory.create(session, batch.id)
    study_session = StudySessionFactory.create(
        session, user.id, batch.id, correct_count=15, wrong_count=5
    )
    attempt = Attempt(
        user_id=user.id,
        question_id=question.id,
        session_id=study_session.id,
        user_answer="answer",
        status=AttemptStatus.wrong,
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)

    with patch("backend.ai.double_check.ai_double_check",
               return_value={"verdict": "overridden", "explanation": "Override."}), \
         patch("backend.routers.topics._save_batch") as mock_save:
        r = client.post(
            f"/api/sessions/{study_session.id}/attempts/{attempt.id}/ai-check",
            headers=_auth(session_cookie, user.id),
        )

    assert r.status_code == 200
    persisted_batch = BatchRepository(session).get_by_id(batch.id)
    assert persisted_batch.status == BatchStatus.completed
    mock_save.assert_called_once()
