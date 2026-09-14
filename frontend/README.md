# Sakafat Global — Frontend

This directory contains the **Next.js frontend**. The backend team owns Python Django and PostgreSQL in `../backend/`.

## Local setup

Use Node.js 22 or newer and npm. From the `frontend/` directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The starter page runs without Django or PostgreSQL.

## Commands

- `npm run dev` — local development
- `npm run lint` — ESLint checks
- `npm run typecheck` — generate route types and check TypeScript
- `npm run build` — production build
- `npm start` — serve the production build

## Structure

```text
src/app/          Pages, layouts, and global styles (App Router)
src/components/   Reusable UI components
src/lib/api/      Django API configuration and future request helpers
src/types/        Shared frontend and API response types
public/           Static images, icons, and fonts
```

Stack: Next.js, React, TypeScript, Tailwind CSS, ESLint. Import source files with `@/`.

## Django integration

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the backend team's API base URL. The example `http://localhost:8000/api/` is a placeholder, not a verified endpoint. `getApiBaseUrl()` in `src/lib/api/config.ts` validates this setting when used. No API calls or authentication are implemented yet.

Agree on endpoint paths, response types, pagination, error formats, and authentication with the backend team before implementing request helpers. Django must allow the frontend origin for browser requests. If cookie authentication is selected, coordinate credentials, CSRF tokens, trusted origins, and cookie settings with that team.

All `NEXT_PUBLIC_` values are visible in the browser and set at build time. Never add database credentials, Django secret keys, or private API keys here. The frontend accesses data through Django APIs; it does not connect directly to PostgreSQL. Backend models, migrations, authorization, and business logic belong in the `backend/` directory.

This is the initial scaffold; final page designs and backend integration are pending. Setup follows the [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation).
