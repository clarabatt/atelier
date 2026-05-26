# Atelier — Architecture & Technical Specification

## Project objective

AI-powered personalised study tool. Users add a topic (e.g. "French prepositions", "WWI causes"), answer AI-generated questions, and track their progress over time through batched sessions.

---

## Stack

| Layer    | Technology                                                              |
| -------- | ----------------------------------------------------------------------- |
| Backend  | Python 3.12, FastAPI, SQLModel, Alembic, uv                             |
| Mobile   | React Native, Expo SDK 56, Expo Router, Zustand, axios, expo-secure-store |
| Database | PostgreSQL 15                                                           |
| AI       | Anthropic Claude (`claude-sonnet-4-20250514`)                           |
| Auth     | Google OAuth 2.0 / OIDC                                                 |
| Infra    | docker-compose (local, backend + postgres only)                         |

---

## Folder structure

```
/
├── backend/
│   ├── database/
│   │   ├── models.py        # SQLModel table definitions
│   │   ├── session.py       # DB engine + session dependency
│   │   ├── repositories/    # Repository classes (TBD)
│   │   └── migrations/      # Alembic migrations
│   ├── routers/             # FastAPI route handlers
│   ├── tests/               # pytest suite (conftest + future tests)
│   ├── auth.py              # JWT helpers + get_current_user (cookie & Bearer)
│   ├── config.py            # pydantic-settings (.env)
│   └── main.py              # FastAPI app entry point
├── mobile/                  # Expo React Native app
│   ├── app/
│   │   ├── _layout.tsx      # Root Stack + AuthGuard
│   │   ├── (auth)/          # Unauthenticated screens
│   │   │   └── login.tsx    # Google OAuth login
│   │   └── (app)/           # Protected screens (auth-gated)
│   │       └── index.tsx    # Home / topic list (stub)
│   ├── stores/
│   │   └── auth.ts          # Zustand auth store (SecureStore persistence)
│   ├── lib/
│   │   └── api.ts           # Axios instance with Bearer token interceptor
│   └── .env.example         # EXPO_PUBLIC_API_URL
├── Dockerfile               # Backend-only multi-stage build
├── docker-compose.yml       # Local dev stack (postgres, backend, adminer)
├── Makefile                 # test-db-up/down/reset + test targets
└── .env.example             # Required environment variables
```

---

## Notes

- Domain routers (topics, batches, questions, sessions, attempts) are TBD — to be added per feature.
- Auth uses a CSRF state pattern: a short-lived `oauth_states` DB record is created on login initiation and consumed on callback.
- All primary keys are UUIDs. `created_at` defaults to `utcnow()` on every table.
- Mobile auth flow: `expo-web-browser.openAuthSessionAsync` opens `/auth/google/login`; backend redirects to `atelier://auth/callback?token=JWT` (requires `MOBILE_REDIRECT_URI` env var). Token stored in SecureStore, sent as `Authorization: Bearer` header.
- `get_current_user` accepts both an HTTP-only `session` cookie (legacy/future web) and an `Authorization: Bearer` header (mobile).
