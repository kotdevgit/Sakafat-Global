# Authentication verification — 19 September 2026

Verified the current Next.js → Django → PostgreSQL authentication flow using a disposable account and Django's file-based email backend. No external emails were sent; the existing SMTP configuration was preserved.

Browser checks passed: registration, local verification email delivery, code verification, login, authenticated state after reload, sign-out, and signed-out state after reload. The disposable account and its email were removed afterward.

Fixed regressions found during verification:

- Verification now requires a username and six numeric digits. Code lookup is restricted to that account, so duplicate codes on different accounts cannot activate the wrong account or crash the lookup.
- Incorrect codes now reach the attempt counter, and a consumed code is checked again under the database lock.
- Password resets now apply Django's configured password-strength validators.

Validation: 25 backend authentication tests, 65 frontend tests, frontend lint, type checks, production build, and diff whitespace checks passed. Tests include account-isolated OTP lookup and rejection of another account's code.

Local-inbox preview: `http://127.0.0.1:3011/en/register`, served against the separate Django instance on port 8001. Verification messages are written to `backend/.local/emails`. This preview overrides the API URL and mail backend in the process environment only; it does not replace saved SMTP settings. Real SMTP delivery was not tested.
