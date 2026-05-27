import uuid

from fastapi import APIRouter, Depends
from sqlmodel import Session

from backend.auth import get_current_user
from backend.database.models import AttemptStatus, User
from backend.database.repositories import (
    AttemptRepository,
    BatchRepository,
    QuestionRepository,
    StudySessionRepository,
    TopicRepository,
    TopicStatsRepository,
)
from backend.database.session import get_session

router = APIRouter()


@router.get("")
async def get_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    all_stats = TopicStatsRepository(db).list_by_user(user.id)
    all_topics = TopicRepository(db).list_by_user(user.id)

    total_answered = sum(s.total_answered for s in all_stats)
    current_streak = max((s.streak_days for s in all_stats), default=0)

    if all_stats and total_answered > 0:
        weighted_sum = sum(s.accuracy_pct * s.total_answered for s in all_stats)
        overall_accuracy = round(weighted_sum / total_answered, 1)
    else:
        overall_accuracy = 0.0

    stats_by_topic = {s.topic_id: s for s in all_stats}
    topics_list = [
        {
            "id": str(t.id),
            "title": t.title,
            "domain": t.domain,
            "accuracy_pct": stats_by_topic[t.id].accuracy_pct if t.id in stats_by_topic else 0.0,
            "total_answered": stats_by_topic[t.id].total_answered if t.id in stats_by_topic else 0,
            "total_skipped": stats_by_topic[t.id].total_skipped if t.id in stats_by_topic else 0,
            "last_activity_at": (
                stats_by_topic[t.id].last_activity_at.isoformat()
                if t.id in stats_by_topic and stats_by_topic[t.id].last_activity_at
                else None
            ),
        }
        for t in all_topics
    ]

    return {
        "total_topics": len(all_topics),
        "overall_accuracy": overall_accuracy,
        "current_streak": current_streak,
        "total_answered": total_answered,
        "topics": topics_list,
    }


@router.get("/topics/{topic_id}")
async def get_topic_stats(
    topic_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    from fastapi import HTTPException

    topic = TopicRepository(db).get_by_user_and_id(user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    batches = BatchRepository(db).list_by_topic(topic_id)

    # Batch history: one row per batch (latest completed session per batch)
    batch_history = []
    for batch in batches:
        completed = [s for s in StudySessionRepository(db).list_by_batch(batch.id) if s.ended_at]
        if completed:
            latest = max(completed, key=lambda s: s.ended_at)  # type: ignore[arg-type]
            total = latest.correct_count + latest.wrong_count
            accuracy = round(latest.correct_count / max(total, 1) * 100)
            batch_history.append({
                "batch_number": batch.batch_number,
                "date": latest.ended_at.isoformat(),  # type: ignore[union-attr]
                "questions_answered": total,
                "accuracy_pct": accuracy,
                "passed": total >= 20 and accuracy >= 80,
            })

    # Session history for chart: one point per completed session with answers
    session_history = []
    for batch in batches:
        for sess in StudySessionRepository(db).list_by_batch(batch.id):
            if not sess.ended_at:
                continue
            total = sess.correct_count + sess.wrong_count
            if total == 0:
                continue
            session_history.append({
                "batch_number": batch.batch_number,
                "ended_at": sess.ended_at.isoformat(),
                "accuracy_pct": round(sess.correct_count / total * 100),
            })
    session_history.sort(key=lambda s: s["ended_at"])

    # Weak spots: 5 questions with lowest correct rate across all user attempts
    all_questions = []
    for batch in batches:
        all_questions.extend(QuestionRepository(db).list_by_batch(batch.id))

    weak_spots = []
    for q in all_questions:
        user_attempts = [
            a for a in AttemptRepository(db).list_by_question(q.id)
            if a.user_id == user.id and a.status != AttemptStatus.skipped
        ]
        if user_attempts:
            correct = sum(1 for a in user_attempts if a.status == AttemptStatus.correct)
            weak_spots.append((correct / len(user_attempts), q))

    weak_spots.sort(key=lambda x: x[0])
    top_5_weak = [
        {
            "id": str(q.id),
            "body": q.body,
            "correct_answer": q.correct_answer,
            "reasoning": q.reasoning,
        }
        for _, q in weak_spots[:5]
    ]

    # Current batch progress (open session on active batch)
    active_batch = BatchRepository(db).get_active(topic_id)
    current_batch = None
    if active_batch:
        open_session = StudySessionRepository(db).get_open(user.id, active_batch.id)
        if open_session:
            total_questions = len(QuestionRepository(db).list_by_batch(active_batch.id))
            current_batch = {
                "batch_number": active_batch.batch_number,
                "total_questions": total_questions,
                "correct": open_session.correct_count,
                "wrong": open_session.wrong_count,
                "skipped": open_session.skipped_count,
            }

    return {
        "batch_history": batch_history,
        "session_history": session_history,
        "weak_spots": top_5_weak,
        "current_batch": current_batch,
    }
