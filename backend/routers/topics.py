import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from backend.ai.diagnostic import run_diagnostic
from backend.auth import get_current_user
from backend.config import settings
from backend.database.models import Topic, User
from backend.database.repositories import TopicRepository, TopicStatsRepository
from backend.database.session import get_session
from backend.schemas.topics import DiagnosticRequest, NewTopicRequest

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
    return {
        "topic": {
            "id": str(topic.id),
            "title": topic.title,
            "domain": topic.domain,
            "ai_level_summary": topic.ai_level_summary,
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
    topic = Topic(user_id=user.id, title=body.title, domain=body.domain)
    topic = TopicRepository(db).add(topic)
    return {
        "topic": {
            "id": str(topic.id),
            "title": topic.title,
            "domain": topic.domain,
            "ai_level_summary": topic.ai_level_summary,
            "created_at": topic.created_at.isoformat(),
        }
    }


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
        return {"message": message, "is_final": True}

    return {"message": message, "is_final": False}
