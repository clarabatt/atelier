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

---

# Mobile Frontend Rules (React Native + Expo)

The mobile app lives in `mobile/`. These rules apply to all work under that directory.

## Tech Stack

- **Framework:** React Native 0.85 + Expo ~56 (cross-platform: iOS, Android, Web)
- **Routing:** Expo Router (file-based, same mental model as Next.js)
- **State:** Zustand for global state; `useState` for transient UI state
- **Styling:** NativeWind (Tailwind utility classes on RN components)
- **HTTP:** Axios via `mobile/lib/api.ts` (auth interceptor already wired)
- **Language:** TypeScript strict mode throughout

## File Organization

```
mobile/
  app/           ← route files only (Expo Router convention)
  components/    ← reusable UI components
  lib/           ← API wrappers and utilities (no UI code)
  stores/        ← Zustand stores
```

- Route files (`app/**`) use **default exports**.
- Everything else (components, stores, lib) uses **named exports**.
- New API calls go in `lib/` as typed wrappers — never call `api` (Axios) directly from a component.

## TypeScript

- Define explicit interfaces for all API response shapes and component props.
- Prefer `interface` over `type` for props and API types.
- No `any`. Use `unknown` and narrow it if the shape is truly unknown.
- Use `enum` for any set of named string/numeric constants (status values, roles, event types, etc.). Export the enum from `lib/` and import it wherever the values are used — never re-declare the same string literals in multiple places.

## State Management

| State type | Where |
|---|---|
| Auth token, current user | `stores/auth.ts` (`useAuthStore`) |
| Diagnostic session conversation | `stores/session.ts` (`useSessionStore`) |
| Form input, loading, local toggles | Component-local `useState` |

Do not add new Zustand stores unless the state is genuinely shared across multiple screens.

## Styling

- Use NativeWind Tailwind classes exclusively (`className="..."`).
- No `StyleSheet.create()` except for platform-specific properties that Tailwind cannot express (e.g., shadow on Android).
- State-driven styles use template literals: `` className={`px-4 ${active ? 'bg-indigo-600' : 'bg-white'}`} ``.
- Follow the existing Slate/Indigo/Emerald color palette.

## Routing (Expo Router)

- Auth guard lives in `app/_layout.tsx` — do not add per-screen redirect logic.
- Use route groups: `(auth)` for unauthenticated screens, `(app)` for protected screens.
- Prefer `router.replace()` for auth transitions; `router.push()` for normal navigation.
- Dynamic segments use `[id]` filenames; access via `useLocalSearchParams()`.

## Forms & Validation

- Track errors as a typed object: `useState<{ field?: string }>({})`.
- Clear individual field errors on change, not on submit.
- Disable the submit button and show `ActivityIndicator` during async submission.
- Use `ref`s to advance focus between inputs on return key.

## Error Handling

- Every async function in `lib/` must be called inside a `try/catch` in the component.
- Show a user-facing error message in state — never `console.error` only.
- Provide graceful empty states (empty list, skeleton) rather than crashing.

## Frontend Testing

**Skip frontend tests for now.** No test infrastructure (Jest/testing-library) is set up. The Mandatory Workflow Protocol (section 7) applies to backend work only — do NOT draft test scenarios or run the gate step for mobile features.
