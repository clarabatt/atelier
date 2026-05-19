# Atelier — Architecture & Technical Specification

## Project objective

AI-powered personalised study tool. Users add a topic (e.g. "French prepositions", "WWI causes"), answer AI-generated questions, and track their progress over time through batched sessions.

---

## Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | Python 3.12, FastAPI, SQLModel, Alembic, uv         |
| Frontend | Vue 3, TypeScript, shadcn-vue, Pinia, SCSS          |
| Database | PostgreSQL 15                                       |
| AI       | Anthropic Claude (`claude-sonnet-4-20250514`)       |
| Auth     | Google OAuth 2.0 / OIDC                             |
| Infra    | docker-compose (local), multi-stage Dockerfile      |

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
│   ├── routers/             # FastAPI route handlers (TBD)
│   ├── tests/               # pytest suite (conftest + future tests)
│   ├── auth.py              # JWT session helpers + get_current_user
│   ├── config.py            # pydantic-settings (.env)
│   └── main.py              # FastAPI app entry point
├── frontend/
│   └── src/
│       ├── views/           # Page-level Vue components
│       ├── components/      # Shared UI components + icons + ui/
│       ├── stores/          # Pinia stores (auth, toast)
│       └── composables/     # Reusable composition functions
├── Dockerfile               # Multi-stage: builds Vue, serves via FastAPI
├── docker-compose.yml       # Local dev stack (postgres, backend, frontend, adminer)
├── Makefile                 # test-db-up/down/reset + test targets
└── .env.example             # Required environment variables
```

---

## Notes

- Agent logic and domain routers are TBD — to be added per feature.
- Auth uses a CSRF state pattern: a short-lived `oauth_states` DB record is created on login initiation and consumed on callback.
- All primary keys are UUIDs. `created_at` defaults to `utcnow()` on every table.
