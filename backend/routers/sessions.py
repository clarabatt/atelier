import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

import logging

from backend.auth import get_current_user
from backend.database.models import (
    AiCheckVerdict,
    Attempt,
    AttemptStatus,
    Batch,
    BatchStatus,
    StudySession,
    TopicStats,
    User,
)
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

logger = logging.getLogger(__name__)

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


@router.post("/{session_id}/attempts/{attempt_id}/ai-check")
async def ai_check_attempt(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    from backend.ai.double_check import ai_double_check

    session_obj = StudySessionRepository(db).get_by_id(session_id)
    if not session_obj or session_obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    attempt = AttemptRepository(db).get_by_id(attempt_id)
    if not attempt or attempt.session_id != session_id:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.ai_check_requested:
        raise HTTPException(status_code=409, detail="Already checked")

    question = QuestionRepository(db).get_by_id(attempt.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    result = ai_double_check(
        question.body,
        question.correct_answer,
        attempt.user_answer or "",
        attempt.status.value,
    )
    verdict = result["verdict"]

    attempt.ai_check_requested = True
    attempt.ai_check_verdict = AiCheckVerdict(verdict)
    attempt.ai_check_explanation = result["explanation"]
    AttemptRepository(db).update(attempt)

    if verdict == "overridden" and attempt.status == AttemptStatus.wrong:
        session_obj.correct_count += 1
        session_obj.wrong_count = max(0, session_obj.wrong_count - 1)
        StudySessionRepository(db).update(session_obj)
        _check_and_trigger_next_batch(session_obj, db)

    return {"verdict": verdict, "explanation": result["explanation"]}


def _check_and_trigger_next_batch(session_obj: StudySession, db: Session) -> None:
    total = session_obj.correct_count + session_obj.wrong_count
    if total < 20:
        return
    accuracy = round(session_obj.correct_count / total * 100)
    if accuracy < 80:
        return

    batch = BatchRepository(db).get_by_id(session_obj.batch_id)
    if not batch or batch.status != BatchStatus.active:
        return

    batch.status = BatchStatus.completed
    BatchRepository(db).update(batch)

    topic = TopicRepository(db).get_by_id(batch.topic_id)
    if topic and topic.ai_level_summary:
        try:
            from backend.routers.topics import _save_batch
            _save_batch(topic, db)
        except Exception:
            logger.exception("New batch generation failed after AI double-check override")


def _update_stats(
    user_id: uuid.UUID,
    topic_id: uuid.UUID,
    session_obj: StudySession,
    db: Session,
) -> None:
    total = session_obj.correct_count + session_obj.wrong_count
    accuracy = round(session_obj.correct_count / max(total, 1) * 100, 1)
    now = datetime.utcnow()

    stats = TopicStatsRepository(db).get_by_user_and_topic(user_id, topic_id)
    if stats:
        stats.total_answered += total
        stats.total_skipped += session_obj.skipped_count
        stats.accuracy_pct = accuracy
        stats.last_activity_at = now
        TopicStatsRepository(db).update(stats)
    else:
        TopicStatsRepository(db).add(TopicStats(
            user_id=user_id,
            topic_id=topic_id,
            accuracy_pct=accuracy,
            total_answered=total,
            total_skipped=session_obj.skipped_count,
            last_activity_at=now,
        ))
