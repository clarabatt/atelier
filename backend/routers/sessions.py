import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from backend.auth import get_current_user
from backend.database.models import Attempt, AttemptStatus, StudySession, TopicStats, User
from backend.database.repositories import (
    AttemptRepository,
    BatchRepository,
    QuestionRepository,
    StudySessionRepository,
    TopicRepository,
    TopicStatsRepository,
)
from backend.database.session import get_session
from backend.schemas.sessions import AttemptRequest, StartSessionRequest

router = APIRouter()


@router.post("", status_code=201)
async def start_session(
    body: StartSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    topic = TopicRepository(db).get_by_user_and_id(user.id, body.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    batch = BatchRepository(db).get_active(body.topic_id)
    if not batch:
        raise HTTPException(status_code=404, detail="No active batch — generate questions first")

    session_obj = StudySessionRepository(db).get_open(user.id, batch.id)
    if not session_obj:
        session_obj = StudySession(user_id=user.id, batch_id=batch.id)
        session_obj = StudySessionRepository(db).add(session_obj)

    questions = QuestionRepository(db).list_by_batch(batch.id)
    attempts = AttemptRepository(db).list_by_session(session_obj.id)
    answered_ids = {a.question_id for a in attempts}

    return {
        "session_id": str(session_obj.id),
        "questions": [
            {
                "id": str(q.id),
                "body": q.body,
                "format": q.format,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "difficulty": q.difficulty,
                "position": q.position,
                "answered": q.id in answered_ids,
            }
            for q in questions
        ],
        "correct_count": session_obj.correct_count,
        "wrong_count": session_obj.wrong_count,
        "skipped_count": session_obj.skipped_count,
    }


@router.post("/{session_id}/attempts")
async def record_attempt(
    session_id: uuid.UUID,
    body: AttemptRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    session_obj = StudySessionRepository(db).get_by_id(session_id)
    if not session_obj or session_obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_obj.ended_at:
        raise HTTPException(status_code=400, detail="Session already completed")

    existing = AttemptRepository(db).get_by_session_and_question(session_id, body.question_id)
    if existing:
        return {"attempt_id": str(existing.id)}

    status = AttemptStatus(body.status)
    attempt = Attempt(
        user_id=user.id,
        question_id=body.question_id,
        session_id=session_id,
        user_answer=body.user_answer,
        status=status,
    )
    AttemptRepository(db).add(attempt)

    if status == AttemptStatus.correct:
        session_obj.correct_count += 1
    elif status == AttemptStatus.wrong:
        session_obj.wrong_count += 1
    else:
        session_obj.skipped_count += 1
    StudySessionRepository(db).update(session_obj)

    return {"attempt_id": str(attempt.id)}


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    session_obj = StudySessionRepository(db).get_by_id(session_id)
    if not session_obj or session_obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session_obj.ended_at:
        session_obj.ended_at = datetime.utcnow()
        StudySessionRepository(db).update(session_obj)

        batch = BatchRepository(db).get_by_id(session_obj.batch_id)
        if batch:
            _update_stats(user.id, batch.topic_id, session_obj, db)

    total = session_obj.correct_count + session_obj.wrong_count
    return {
        "correct": session_obj.correct_count,
        "wrong": session_obj.wrong_count,
        "skipped": session_obj.skipped_count,
        "accuracy_pct": round(session_obj.correct_count / max(total, 1) * 100),
    }


def _update_stats(
    user_id: uuid.UUID,
    topic_id: uuid.UUID,
    session_obj: StudySession,
    db: Session,
) -> None:
    total = session_obj.correct_count + session_obj.wrong_count
    accuracy = round(session_obj.correct_count / max(total, 1) * 100, 1)
    now = datetime.utcnow()
    today = now.date()

    stats = TopicStatsRepository(db).get_by_user_and_topic(user_id, topic_id)
    if stats:
        stats.total_answered += total
        stats.total_skipped += session_obj.skipped_count
        stats.accuracy_pct = accuracy
        if stats.last_activity_at:
            last_date = stats.last_activity_at.date()
            if last_date < today - timedelta(days=1):
                stats.streak_days = 1
            elif last_date == today - timedelta(days=1):
                stats.streak_days += 1
            # last_date == today: streak unchanged
        else:
            stats.streak_days = 1
        stats.last_activity_at = now
        TopicStatsRepository(db).update(stats)
    else:
        TopicStatsRepository(db).add(TopicStats(
            user_id=user_id,
            topic_id=topic_id,
            accuracy_pct=accuracy,
            total_answered=total,
            total_skipped=session_obj.skipped_count,
            streak_days=1,
            last_activity_at=now,
        ))
