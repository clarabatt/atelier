TEST_DB_CONTAINER = atelier-test-db
TEST_DB_PORT      = 5434
TEST_DB_NAME      = atelier_test
TEST_DB_USER      = atelier
TEST_DB_PASS      = atelier
TEST_DATABASE_URL = postgresql://$(TEST_DB_USER):$(TEST_DB_PASS)@localhost:$(TEST_DB_PORT)/$(TEST_DB_NAME)

.PHONY: test-db-up test-db-down test-db-reset test

test-db-up:
	docker run -d \
		--name $(TEST_DB_CONTAINER) \
		-e POSTGRES_USER=$(TEST_DB_USER) \
		-e POSTGRES_PASSWORD=$(TEST_DB_PASS) \
		-e POSTGRES_DB=$(TEST_DB_NAME) \
		-p $(TEST_DB_PORT):5432 \
		postgres:15-alpine
	@echo "Waiting for test database..."
	@until docker exec $(TEST_DB_CONTAINER) pg_isready -U $(TEST_DB_USER) -d $(TEST_DB_NAME) -q; do sleep 1; done
	@echo "Test database ready."

test-db-down:
	docker rm -f $(TEST_DB_CONTAINER) 2>/dev/null || true

test-db-reset: test-db-down test-db-up

test:
	TEST_DATABASE_URL=$(TEST_DATABASE_URL) uv run pytest -v
