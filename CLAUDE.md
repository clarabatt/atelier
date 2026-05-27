# The Forge: AI Testing Rules

You are an expert SDET focusing on high-confidence integration tests. You must follow these rules for every testing task.

## 1. Quality Over Quantity

- Do not suggest "coverage" tests.

## 2. No Mocking/Spying Policy

- **Backend:** Use a real PostgreSQL database (SQLModel). Do not mock repository methods or services.
- **Exceptions:** Only mock the "Edge":
  - External AI APIs (Gemini/Anthropic).
  - Google OAuth callbacks.
  - GCS Signed URL generation.

## 3. Behavior-Driven Implementation

- **Backend:** Test the API contract (`httpx.AsyncClient`). Verify side effects in the DB.

## 4. Test Data: Factory Classes

Create test data with factory classes from `backend/tests/factories.py`. Each model has a corresponding `XxxFactory` class with a `create(session, ...)` static method. Do not use the fixture-returning-factory pattern (`make_user`, `make_topic`, etc.).

Every factory uses a `{**defaults, **kwargs}` merge so any model field can be set at creation time. Never mutate an object after creation — pass the desired state as kwargs instead.

```python
# correct
user = UserFactory.create(session, is_active=False)
study_session = StudySessionFactory.create(session, user.id, batch.id, correct_count=7, wrong_count=3)

# wrong
user = UserFactory.create(session)
user.is_active = False
session.add(user)
session.commit()
```

Add a new `XxxFactory` class to `backend/tests/factories.py` when a new model needs test data.

## 5. Test File Location

Test files must mirror the source tree under `backend/tests/`. A test for `backend/routers/sessions.py` lives at `backend/tests/routers/test_sessions.py`.

```
backend/
  routers/sessions.py      →  tests/routers/test_sessions.py
  routers/topics.py        →  tests/routers/test_topics.py
  ai/batch.py              →  tests/ai/test_batch.py
  database/repositories/   →  tests/database/repositories/test_*.py
```

Shared fixtures stay in `backend/tests/conftest.py`; factory classes in `backend/tests/factories.py`.

## 6. DB Assertions: Use Repositories

When verifying side effects in the database, query through the repository layer — do not call `session.refresh()` on in-memory objects.

```python
# correct
from backend.database.repositories import StudySessionRepository

persisted = StudySessionRepository(session).get_by_id(study_session.id)
assert persisted.correct_count == 1

# wrong
session.refresh(study_session)
assert study_session.correct_count == 1
```

## 7. Mandatory Workflow Protocol

For EVERY implementation or feature request, you MUST follow this loop without being reminded:

1. **Test Strategy First:** Immediately cross-reference `docs/TESTING.md`.
2. **Draft Scenarios:** Define the "Given/When/Then" for the feature.
3. **Draft the Tests:** Write the actual test code (Pytest).
4. **The Gate:** Pause and say: "The test plan and code are ready. Please approve or suggest changes before I write the implementation."
5. **Implement:** ONLY proceed to writing the feature code after I give the 'GO'.
