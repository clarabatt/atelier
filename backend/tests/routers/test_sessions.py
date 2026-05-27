import uuid
from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.database.models import Attempt, AttemptStatus, TopicStats
from backend.database.repositories import (
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
# Batch summary fields (AT-020)
# ---------------------------------------------------------------------------

def test_complete_session_returns_time_taken(client: TestClient, session: Session, session_cookie) -> None:
    user, _, study_session = _setup(session)
    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    assert "time_taken_seconds" in r.json()
    assert r.json()["time_taken_seconds"] >= 0


def test_complete_session_threshold_passed_true(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=16, wrong_count=4)

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert r.json()["threshold_passed"] is True


def test_complete_session_threshold_passed_false_low_accuracy(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=10, wrong_count=10)

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert r.json()["threshold_passed"] is False


def test_complete_session_threshold_passed_false_too_few_answered(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=8, wrong_count=2)

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert r.json()["threshold_passed"] is False


def test_complete_session_includes_weak_questions(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    q1 = QuestionFactory.create(session, batch.id, position=1)
    q2 = QuestionFactory.create(session, batch.id, position=2)
    study_session = StudySessionFactory.create(session, user.id, batch.id)

    session.add(Attempt(user_id=user.id, question_id=q1.id, session_id=study_session.id, status=AttemptStatus.wrong))
    session.add(Attempt(user_id=user.id, question_id=q2.id, session_id=study_session.id, status=AttemptStatus.correct))
    session.commit()

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    weak = r.json()["weak_questions"]
    assert len(weak) == 1
    assert weak[0]["id"] == str(q1.id)
    assert "body" in weak[0]
    assert "correct_answer" in weak[0]
    assert "reasoning" in weak[0]


def test_complete_session_weak_questions_capped_at_three(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id)

    for i in range(5):
        q = QuestionFactory.create(session, batch.id, position=i + 1)
        session.add(Attempt(user_id=user.id, question_id=q.id, session_id=study_session.id, status=AttemptStatus.wrong))
    session.commit()

    r = client.post(f"/api/sessions/{study_session.id}/complete", headers=_auth(session_cookie, user.id))
    assert len(r.json()["weak_questions"]) == 3
