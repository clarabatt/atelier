import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from backend.ai.batch import generate_batch
from backend.ai.diagnostic import run_diagnostic
from backend.auth import get_current_user
from backend.config import settings
from backend.database.models import Batch, Question, Topic, User
from backend.database.repositories import (
    BatchRepository,
    QuestionRepository,
    TopicRepository,
    TopicStatsRepository,
)
from backend.database.session import get_session
from backend.schemas.topics import DiagnosticRequest, NewTopicRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_topics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    topics = TopicRepository(db).list_by_user(user.id)
    stats_repo = TopicStatsRepository(db)

    result = []
    for topic in topics:
        stats = stats_repo.get_by_user_and_topic(user.id, topic.id)
        result.append(
            {
                "id": str(topic.id),
                "title": topic.title,
                "domain": topic.domain,
                "accuracy_pct": stats.accuracy_pct if stats else 0.0,
                "last_activity_at": (
                    stats.last_activity_at.isoformat()
                    if stats and stats.last_activity_at
                    else None
                ),
                "created_at": topic.created_at.isoformat(),
            }
        )

    return {"topics": result}


@router.get("/{topic_id}")
async def get_topic(
    topic_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    topic = TopicRepository(db).get_by_user_and_id(user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    stats = TopicStatsRepository(db).get_by_user_and_topic(user.id, topic_id)
    batch = BatchRepository(db).get_active(topic_id)
    return {
        "topic": {
            "id": str(topic.id),
            "title": topic.title,
            "domain": topic.domain,
            "ai_level_summary": topic.ai_level_summary,
            "has_batch": batch is not None,
            "accuracy_pct": stats.accuracy_pct if stats else 0.0,
            "last_activity_at": (
                stats.last_activity_at.isoformat() if stats and stats.last_activity_at else None
            ),
            "created_at": topic.created_at.isoformat(),
        }
    }


@router.post("", status_code=201)
async def create_topic(
    body: NewTopicRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    topic = Topic(
        user_id=user.id,
        title=body.title,
        domain=body.domain,
        ai_level_summary=body.level_summary(),
    )
    topic = TopicRepository(db).add(topic)

    if topic.ai_level_summary:
        try:
            _save_batch(topic, db)
        except Exception:
            logger.exception("Batch generation failed after manual level set for topic %s", topic.id)

    return {
        "topic": {
            "id": str(topic.id),
            "title": topic.title,
            "domain": topic.domain,
            "ai_level_summary": topic.ai_level_summary,
            "created_at": topic.created_at.isoformat(),
        }
    }


@router.post("/{topic_id}/batches", status_code=201)
async def create_batch(
    topic_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    topic = TopicRepository(db).get_by_user_and_id(user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if not topic.ai_level_summary:
        raise HTTPException(status_code=400, detail="Complete the diagnostic first")

    existing = BatchRepository(db).get_active(topic_id)
    if existing:
        return {"batch_id": str(existing.id)}

    try:
        batch = _save_batch(topic, db)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="AI service error") from exc

    return {"batch_id": str(batch.id)}


@router.post("/{topic_id}/diagnostic")
async def diagnostic(
    topic_id: uuid.UUID,
    body: DiagnosticRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    topic = TopicRepository(db).get_by_user_and_id(user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    try:
        message, summary = run_diagnostic(topic.title, topic.domain, body.conversation)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="AI service error") from exc

    if summary is not None:
        topic.ai_level_summary = summary
        TopicRepository(db).update(topic)

        try:
            _save_batch(topic, db)
        except Exception:
            logger.exception("Batch generation failed after diagnostic for topic %s", topic_id)

        return {"message": message, "is_final": True}

    return {"message": message, "is_final": False}


def _save_batch(topic: Topic, db: Session) -> Batch:
    questions_data = generate_batch(topic.title, topic.domain, topic.ai_level_summary)  # type: ignore[arg-type]

    existing_batches = BatchRepository(db).list_by_topic(topic.id)
    batch = Batch(topic_id=topic.id, batch_number=len(existing_batches) + 1)
    batch = BatchRepository(db).add(batch)

    for i, q in enumerate(questions_data):
        question = Question(
            batch_id=batch.id,
            body=q["body"],
            format=q["format"],
            options=q.get("options"),
            correct_answer=q["correct_answer"],
            reasoning=q["reasoning"],
            difficulty=int(q.get("difficulty", 3)),
            position=i + 1,
        )
        QuestionRepository(db).add(question)

    return batch
