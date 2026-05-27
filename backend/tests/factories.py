import uuid

from sqlmodel import Session

from backend.database.models import Batch, Question, QuestionFormat, StudySession, Topic, User


class UserFactory:
    @staticmethod
    def create(session: Session, **kwargs) -> User:
        defaults = {
            "email": f"{uuid.uuid4().hex[:8]}@test.com",
            "google_sub": str(uuid.uuid4()),
            "display_name": "Test User",
            "picture_url": None,
            "is_active": True,
        }
        user = User(**{**defaults, **kwargs})
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


class TopicFactory:
    @staticmethod
    def create(session: Session, user_id: uuid.UUID, **kwargs) -> Topic:
        defaults = {
            "user_id": user_id,
            "title": "Python Basics",
            "domain": "Programming",
            "ai_level_summary": None,
        }
        topic = Topic(**{**defaults, **kwargs})
        session.add(topic)
        session.commit()
        session.refresh(topic)
        return topic


class BatchFactory:
    @staticmethod
    def create(session: Session, topic_id: uuid.UUID, **kwargs) -> Batch:
        defaults = {
            "topic_id": topic_id,
            "batch_number": 1,
        }
        batch = Batch(**{**defaults, **kwargs})
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch


class QuestionFactory:
    @staticmethod
    def create(session: Session, batch_id: uuid.UUID, **kwargs) -> Question:
        defaults = {
            "batch_id": batch_id,
            "body": "What is Python?",
            "format": QuestionFormat.mcq,
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "reasoning": "Because A",
            "difficulty": 2,
            "position": 1,
        }
        q = Question(**{**defaults, **kwargs})
        session.add(q)
        session.commit()
        session.refresh(q)
        return q


class StudySessionFactory:
    @staticmethod
    def create(session: Session, user_id: uuid.UUID, batch_id: uuid.UUID, **kwargs) -> StudySession:
        defaults = {
            "user_id": user_id,
            "batch_id": batch_id,
            "correct_count": 0,
            "wrong_count": 0,
            "skipped_count": 0,
        }
        study_session = StudySession(**{**defaults, **kwargs})
        session.add(study_session)
        session.commit()
        session.refresh(study_session)
        return study_session
