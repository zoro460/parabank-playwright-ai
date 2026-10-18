# Project: ParaBank Playwright Automation

## Stack
- Playwright Test with TypeScript
- Page Object Model: page classes in /pages, tests in /tests
- API tests in /tests/api using Playwright's request fixture

## Conventions
- Use role-based or label-based locators (getByRole, getByLabel). Avoid XPath and CSS chains.
- Never use page.waitForTimeout. Rely on auto-waiting and web-first assertions.
- Credentials and URLs come from .env (never hardcode them).
- Each test must be independent. Register a fresh user via a fixture when a test needs one.
- Use playwright-cli (headed) to explore pages before writing tests.

## App under test
- Base URL: https://parabank.parasoft.com/parabank
- It is a shared public demo; data may reset at any time.