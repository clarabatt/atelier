# Testing Specification & Standards

## Philosophy

We favor **Integration Tests** that mimic real-world usage. If a test passes but the app is broken because a database constraint was missed, the test has failed its purpose.

---

## Backend (Pytest + SQLModel)

### Setup

- We use a dedicated PostgreSQL test container/database.
- Use `pytest-asyncio` for FastAPI endpoint testing.

### Guidelines

- **Real DB:** Every test starts with a clean database. Use fixtures to seed `users` and `resumes`.
- **Logic Validation:** Test the `Judge` validator against real strings. Ensure that programmatic rules (date mutation detection) are absolute.
- **AI Mocking:** Use a `conftest.py` fixture to intercept calls to Gemini/Anthropic and return static JSON "Golden Files."

**Example:**

```python
# Test the effect, not the function
async def test_upload_resume_persists_to_db(client, test_db, mock_gcs):
    response = await client.post("/api/resumes/upload", files=...)
    assert response.status_code == 201

    # Verify reality
    resume = await test_db.get(Resume, response.json()["id"])
    assert resume.status == "UPLOADED"
```

## Frontend (Vitest + Testing Library)

### Setup

- **Tooling:** Vitest, @testing-library/vue, msw.
- **User Mimicry:** Use fireEvent to simulate user journey.

### Guidelines

- **Black-box Testing:** The test should not know Pinia exists. It should only know that when a user clicks "Approve," a "Tailoring" status eventually appears.
- **No Store Spying:** Do not assert on store.state. Assert on screen.getByText.
- **Network:** Use msw handlers to simulate the FastAPI response.

Example:

```TypeScript
// Test the behavior, not the store
test('user can approve detected skills', async () => {
  render(SkillApprovalGate);

  const checkbox = await screen.findByRole('checkbox', { name: /typescript/i });
  await fireEvent.click(checkbox);

  const submitBtn = screen.getByRole('button', { name: /start tailoring/i });
  await fireEvent.click(submitBtn);

  expect(await screen.findByText(/tailoring in progress/i)).toBeInTheDocument();
});
```

### The "Judge" Test Suite (Critical)

1. The Judge is a programmatic validator. It requires a dedicated suite of Negative Tests:
2. Date Mutation: Input a modified bullet point where "2021" becomes "2022". Assert rejection.
3. Employer Deletion: Input a modified block where "Google" is removed. Assert rejection.
4. Must-Have Check: Ensure the Judge fails if a must-have skill identified by the JD agent is missing from the output.
