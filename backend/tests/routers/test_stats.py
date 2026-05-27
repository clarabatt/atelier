import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.database.models import Attempt, AttemptStatus, TopicStats
from backend.database.repositories import TopicStatsRepository
from backend.tests.factories import (
    BatchFactory,
    QuestionFactory,
    StudySessionFactory,
    TopicFactory,
    UserFactory,
)


def _auth(session_cookie, user_id) -> dict:
    return {"Authorization": f"Bearer {session_cookie(str(user_id))}"}


# ---------------------------------------------------------------------------
# GET /api/stats (AT-021, AT-022)
# ---------------------------------------------------------------------------

def test_stats_empty_for_new_user(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    body = r.json()
    assert body["total_topics"] == 0
    assert body["overall_accuracy"] == 0.0
    assert body["current_streak"] == 0
    assert body["total_answered"] == 0
    assert body["topics"] == []


def test_stats_counts_all_topics(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id)
    TopicFactory.create(session, user.id)

    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    assert r.json()["total_topics"] == 2


def test_stats_aggregates_answered_and_accuracy(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic1 = TopicFactory.create(session, user.id)
    topic2 = TopicFactory.create(session, user.id)
    session.add(TopicStats(user_id=user.id, topic_id=topic1.id, accuracy_pct=80.0, total_answered=10))
    session.add(TopicStats(user_id=user.id, topic_id=topic2.id, accuracy_pct=60.0, total_answered=10))
    session.commit()

    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    body = r.json()
    assert body["total_answered"] == 20
    assert body["overall_accuracy"] == 70.0


def test_stats_current_streak_is_max_across_topics(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic1 = TopicFactory.create(session, user.id)
    topic2 = TopicFactory.create(session, user.id)
    session.add(TopicStats(user_id=user.id, topic_id=topic1.id, accuracy_pct=80.0, total_answered=5, streak_days=3))
    session.add(TopicStats(user_id=user.id, topic_id=topic2.id, accuracy_pct=60.0, total_answered=5, streak_days=7))
    session.commit()

    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    assert r.json()["current_streak"] == 7


def test_stats_per_topic_table_contains_stats(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id, title="Python", domain="Programming")
    session.add(TopicStats(
        user_id=user.id,
        topic_id=topic.id,
        accuracy_pct=75.0,
        total_answered=20,
        total_skipped=2,
        last_activity_at=datetime.utcnow(),
    ))
    session.commit()

    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    topics = r.json()["topics"]
    assert len(topics) == 1
    t = topics[0]
    assert t["title"] == "Python"
    assert t["domain"] == "Programming"
    assert t["accuracy_pct"] == 75.0
    assert t["total_answered"] == 20
    assert t["total_skipped"] == 2
    assert t["last_activity_at"] is not None


def test_stats_topic_without_activity_shows_zeros(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    TopicFactory.create(session, user.id)

    r = client.get("/api/stats", headers=_auth(session_cookie, user.id))
    t = r.json()["topics"][0]
    assert t["accuracy_pct"] == 0.0
    assert t["total_answered"] == 0
    assert t["last_activity_at"] is None


def test_stats_unauthenticated(client: TestClient, session: Session) -> None:
    r = client.get("/api/stats")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/stats/topics/{id} (AT-023)
# ---------------------------------------------------------------------------

def test_topic_stats_not_found(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    r = client.get(f"/api/stats/topics/{uuid.uuid4()}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 404


def test_topic_stats_wrong_user_gets_404(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    other_user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, other_user.id))
    assert r.status_code == 404


def test_topic_stats_empty_when_no_sessions(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert r.status_code == 200
    body = r.json()
    assert body["batch_history"] == []
    assert body["session_history"] == []
    assert body["weak_spots"] == []
    assert body["current_batch"] is None


def test_topic_stats_batch_history_from_completed_sessions(
    client: TestClient, session: Session, session_cookie
) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    ended = datetime.utcnow() - timedelta(hours=1)
    StudySessionFactory.create(
        session, user.id, batch.id,
        correct_count=16, wrong_count=4, ended_at=ended
    )

    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    history = r.json()["batch_history"]
    assert len(history) == 1
    assert history[0]["batch_number"] == 1
    assert history[0]["questions_answered"] == 20
    assert history[0]["accuracy_pct"] == 80
    assert history[0]["passed"] is True


def test_topic_stats_session_history_for_chart(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    StudySessionFactory.create(
        session, user.id, batch.id,
        correct_count=8, wrong_count=2,
        ended_at=datetime.utcnow() - timedelta(hours=2)
    )
    StudySessionFactory.create(
        session, user.id, batch.id,
        correct_count=9, wrong_count=1,
        ended_at=datetime.utcnow() - timedelta(hours=1)
    )

    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    chart = r.json()["session_history"]
    assert len(chart) == 2
    assert chart[0]["accuracy_pct"] == 80
    assert chart[1]["accuracy_pct"] == 90


def test_topic_stats_weak_spots_limited_to_five(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    study_session = StudySessionFactory.create(session, user.id, batch.id)

    for i in range(7):
        q = QuestionFactory.create(session, batch.id, position=i + 1)
        session.add(Attempt(user_id=user.id, question_id=q.id, session_id=study_session.id, status=AttemptStatus.wrong))
    session.commit()

    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    assert len(r.json()["weak_spots"]) == 5


def test_topic_stats_current_batch_shows_open_session(client: TestClient, session: Session, session_cookie) -> None:
    user = UserFactory.create(session)
    topic = TopicFactory.create(session, user.id)
    batch = BatchFactory.create(session, topic.id)
    QuestionFactory.create(session, batch.id, position=1)
    QuestionFactory.create(session, batch.id, position=2)
    StudySessionFactory.create(session, user.id, batch.id, correct_count=3, wrong_count=1)

    r = client.get(f"/api/stats/topics/{topic.id}", headers=_auth(session_cookie, user.id))
    cb = r.json()["current_batch"]
    assert cb is not None
    assert cb["total_questions"] == 2
    assert cb["correct"] == 3
    assert cb["wrong"] == 1
