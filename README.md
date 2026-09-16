# Sakafat Global

A bilingual (English / Urdu) cultural-media platform: a **Next.js** website in front of a
**Django REST Framework** API and a **PostgreSQL** database.

```text
frontend/          Next.js 16 app — App Router, TypeScript, CSS Modules, Tailwind
backend/saqaft/    Django 6 project and its apps (User, Programme, Episode, Contact)
scripts/doctor.sh  One-command health check for a local environment
```

---

## How the pieces fit together

The browser only ever talks to Next.js. Next.js talks to Django server-side — a
**backend-for-frontend (BFF)** arrangement, so there are no cross-origin requests
from the browser and no access tokens in browser JavaScript.

```text
browser  ──►  Next.js (localhost:3000)  ──►  Django (127.0.0.1:8000/api/)  ──►  PostgreSQL
              same-origin /api/...            server-to-server
```

| Concern | Path |
| --- | --- |
| Programmes & episodes | Server Components read `GET /api/programme/` and `GET /api/episode/` directly, revalidated every 60s |
| Authentication | `/api/auth/<action>` proxies Django's `login/`, `register/`, `verify_otp/`, `resend_otp/`, `token/refresh/`, `forgot-password/`, `verify-reset-otp/`, `reset-password/` |
| Sessions | Access and refresh JWTs live in HTTP-only, SameSite=Lax cookies (`sakafat_access`, `sakafat_refresh`), Secure in production |
| Enquiries | `/api/contact` forwards multipart form data to Django's `contact/`, which stores the enquiry and emails an acknowledgement |
| Uploaded images | Served from Django's `/media/`; `next.config.ts` derives the allowed origin from `DJANGO_API_BASE_URL` |

Django validates everything independently. Its endpoints are public, so the
browser is never trusted — the frontend's checks exist to give fast feedback, not
to enforce anything.

---

## Prerequisites

- **Node.js 22+** and npm (`frontend/.nvmrc` pins 22)
- **Python 3.12+**
- **PostgreSQL**, reachable at whatever `backend/saqaft/.env` points to

---

## Local setup

### 1. Backend

```bash
cd backend/saqaft
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in DB_* and SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

API at `http://127.0.0.1:8000/api/`, admin at `http://127.0.0.1:8000/admin/`.

`.env.example` sets `EMAIL_BACKEND` to Django's file-based backend, which writes
messages to `backend/.local/emails` instead of sending them. Keep it that way
locally — pointed at real SMTP without a reachable mail server, every
registration fails on a connection error.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` — it redirects to `/en` or `/ur`.

### Environment variables

`frontend/.env.local`:

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | build-time, visible in the browser | Public API base |
| `DJANGO_API_BASE_URL` | server-side route handlers | Never reaches the browser |

Anything prefixed `NEXT_PUBLIC_` is baked into the bundle and readable by
anyone. Database credentials, Django's secret key and mail passwords belong in
`backend/saqaft/.env` only. Neither `.env` file is committed.

---

## Languages and routing

Every page lives under a language segment — `/en/programs`, `/ur/programs` — and
an address without one is redirected to a language by `frontend/src/proxy.ts`
(cookie preference first, then `Accept-Language`, then English).

- `src/lib/i18n/dictionaries/en.json` and `ur.json` hold all 461 translatable
  strings in the same shape. English is the type source, so a key missing from
  Urdu fails `npm run typecheck` rather than shipping blank.
- Urdu renders right-to-left. The layout sets `dir` on `<html>`, component CSS
  uses logical properties (`inset-inline-start`, `padding-inline-end`) so it
  mirrors without duplicate rules, and Urdu switches to Noto Nastaliq with its
  own leading.
- Validation rules return a message *code*, not a sentence, so the browser form
  and the API route produce the same message in whichever language is active.
- `npm run translate` seeds `ur.machine.json` from the Google Translate API for a
  human to edit. It never overwrites `ur.json`, and reads its key from
  `GOOGLE_TRANSLATE_API_KEY` in the environment.

Content stored in Django — programme and episode names, descriptions, status and
pillar labels — is currently single-language and appears as entered on both
sides of the site.

---

## Commands

From `frontend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | 65 tests: route handlers, validation, i18n, hero selection (all mocked — no accounts, enquiries or emails) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run translate` | Seed a machine-translated Urdu draft |

From `backend/saqaft/`:

```bash
./.venv/bin/python manage.py test    # 77 tests across User, Programme, Episode, Contact
```

Django's test runner builds and drops its own database; it does not touch
development data.

---

## Managing content

Everything public is edited in the Django admin, not in code.

- **Programmes** — `/admin/Programme/programme/`. Card colour comes from the
  **pillar**, so a new programme is styled without new CSS. Order follows
  **position**; unchecking **is active** removes it from the public site.
- **Episodes** — `/admin/Episode/episode/`. Categories are rows at
  `/admin/Episode/episodecategory/`, addable with no migration or deploy. The
  homepage hero uses the **first episode by position**, preferring its portrait
  image; upload at least 1040×1188 for a sharp result. The play button stays
  disabled until **video url** is set.
- **Enquiries** — submissions from the contact form, admin-readable.

If Django is unreachable the pages still render, with a message in place of the
missing content rather than an error.

---

## Layout

```text
frontend/
  src/app/[lang]/       Pages and layouts, served in both languages
  src/app/api/          Route handlers (outside [lang] — they infer the locale)
  src/components/       UI by area: layout, home, programs, pillars, contact, auth, i18n
  src/lib/api/          Django fetchers and response types
  src/lib/i18n/         Locale config, dictionaries, server and client access
  src/lib/validation/   Field rules shared by the forms and the API routes
  src/proxy.ts          Locale negotiation and redirect
  tests/                node --test suites
  scripts/              Maintenance scripts (Urdu seeding)
  public/images/        brand, hero, featured, pillars, programs, founder, footer
  mockups/              Design PDFs — outside the served folder
backend/saqaft/         Django project; each app owns its models, views and tests
```

Import source files with `@/`. Typography lives in `app/[lang]/globals.css` as
`--type-*` tokens; use those rather than adding per-component sizes.

---

## When something looks empty

```bash
sh scripts/doctor.sh
```

It checks configuration files, pending migrations, row counts, Django's HTTP
responses and the rendered pages in both languages, then prints what failed and
the command that fixes it. It prints no secrets, so its output is safe to share.

---

## Further reading

- `frontend/README.md` — frontend detail: header, hero, typography, auth flows, forms
- `backend/README.md` — API endpoint reference and authentication flow
