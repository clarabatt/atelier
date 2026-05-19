# Atelier

AI-powered personalised study tool. Add a topic, answer AI-generated questions,
and track your progress over time.

## Stack
- Backend: Python 3.12 / FastAPI / SQLModel / Alembic / uv
- Frontend: Vue 3 / TypeScript / shadcn-vue / Pinia
- Database: PostgreSQL 15
- AI: Anthropic Claude (claude-sonnet-4-20250514)
- Auth: Google OAuth 2.0

## Local development

### 1. Configure environment
```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY
```

### 2. Start the database
```bash
docker compose up postgres -d
```

### 3. Install backend dependencies
```bash
uv sync
```

### 4. Run migrations
```bash
uv run alembic upgrade head
```

### 5. Install frontend dependencies
```bash
cd frontend && npm install
```

### 6. Start dev servers
```bash
# Terminal 1
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- API / Swagger: http://localhost:8000/docs

## Testing

```bash
make test-db-up   # start isolated test postgres on port 5434
make test         # run pytest
make test-db-down # stop test postgres
```
