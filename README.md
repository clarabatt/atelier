# Atelier

AI-powered personalised study tool. Add a topic, answer AI-generated questions,
and track your progress over time.

## Stack
- Backend: Python 3.12 / FastAPI / SQLModel / Alembic / uv
- Mobile: React Native / Expo SDK 56 / Expo Router / Zustand
- Database: PostgreSQL 15
- AI: Anthropic Claude (claude-sonnet-4-20250514)
- Auth: Google OAuth 2.0

## Local development

### 1. Configure environment
```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY, SECRET_KEY
# Set MOBILE_REDIRECT_URI=atelier://auth/callback

cp mobile/.env.example mobile/.env
# Set EXPO_PUBLIC_API_URL:
#   Android emulator → http://10.0.2.2:8000
#   iOS simulator    → http://localhost:8000
#   Physical device  → http://<your-local-IP>:8000
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

### 5. Install mobile dependencies
```bash
cd mobile && npm install
```

### 6. Start dev servers
```bash
# Terminal 1 — backend
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2 — mobile (scan QR with Expo Go)
cd mobile && npm start
```

- API / Swagger: http://localhost:8000/docs

## Testing

```bash
make test-db-up   # start isolated test postgres on port 5434
make test         # run pytest
make test-db-down # stop test postgres
```
