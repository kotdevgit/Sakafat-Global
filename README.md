# Sakafat Global

A full-stack cultural-media platform consisting of a **Next.js frontend**, a **Python Django REST Framework backend**, and a **PostgreSQL** database.

```text
frontend/         Next.js application (App Router, Tailwind CSS, TypeScript)
backend/          Django application (DRF, SimpleJWT, PostgreSQL)
backend/saqaft/   Django project root and apps (User, Programme, Contact)
```

---

## System Architecture

The frontend and backend communicate via a **Backend-For-Frontend (BFF) proxy pattern**:
- **Public & SSR Access**: The Next.js server fetches published programmes directly from Django (`GET /api/programme/` and `GET /api/programme/<slug>/`) with 60-second revalidation.
- **Authentication**: Next.js route handlers (`/api/auth/*`) proxy requests to Django (`login/`, `register/`, `verify_otp/`, `resend_otp/`, `token/refresh/`, `forgot-password/`, `verify-reset-otp/`, `reset-password/`). Access and refresh JWTs are kept in secure, HTTP-only cookies (`sakafat_access` and `sakafat_refresh`) without exposure to browser JavaScript.
- **Contact & Enquiries**: Submitted via `/api/contact` multipart form data and forwarded to Django (`contact/`), storing the submission in PostgreSQL and dispatching an email confirmation.

---

## Prerequisites

- **Node.js** 22 or newer & **npm**
- **Python** 3.12 or newer & virtualenv
- **PostgreSQL** (running locally on port 5433 or configured in `.env`)

---

## Local Development Setup

### 1. Database & Backend

From the repository root:

```sh
cd backend/saqaft

# Create virtual environment if needed
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment variables (defaults connect to sakafat_local on port 5433)
cp .env.example .env

# Apply migrations
python manage.py migrate

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

The Django REST API runs at `http://127.0.0.1:8000/api/` and the Admin panel at `http://127.0.0.1:8000/admin/`.

### 2. Frontend

In a separate terminal:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` to browse the website.

---

## Running Verification & Tests

### Frontend Checks
Run from `frontend/`:
```sh
npm test          # Runs 19 automated proxy route and authentication tests
npm run lint      # Runs ESLint checks
npm run typecheck # Verifies TypeScript typing and route params
npm run build     # Compiles production build and static pages
```

### Backend Checks
Run from `backend/saqaft/`:
```sh
./.venv/bin/python manage.py test # Runs all 27 unit tests across User, Programme, and Contact
```
