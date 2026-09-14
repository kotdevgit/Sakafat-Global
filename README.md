# Sakafat Global

A website with a Next.js frontend and a Python Django backend using PostgreSQL.

```text
frontend/   Next.js application — frontend team
backend/    Django backend — backend team (placeholder)
```

## Frontend development

Use Node.js 22 or newer and npm:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The starter page works without the backend.

See [frontend setup and API integration](frontend/README.md) for commands and conventions. See [backend ownership](backend/README.md) for the planned backend scope.

Run frontend checks from `frontend/`: `npm run lint`, `npm run typecheck`, and `npm run build`.

Django and PostgreSQL are not implemented or connected yet. Frontend data access will go through Django APIs.
