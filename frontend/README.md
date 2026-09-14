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

## Shared header

`src/components/layout/site-header.tsx` is mounted once in the root layout and reused across pages. Its CSS module handles desktop navigation and a mobile disclosure menu below 1100px. The menu closes on Escape, outside click, focus leaving the header, link selection, and switching to desktop.

Update the typed navigation list as pages are built; only Home is currently enabled to avoid broken destinations. Login and Urdu are unavailable placeholders, not implemented authentication or translation. The active page is derived from the current path. New pages should give their main element `id="main-content"` and `tabIndex={-1}` for the skip link.

The logo was raster-extracted from `mockups/Sakafat Landing Page.pdf`; replace it with the original brand asset when available. Navigation uses Poppins Regular (400), 16px, 100% line-height, and zero letter spacing, as provided by the designer. Next.js self-hosts the Google font at build time.

## Adding image assets

Place images under `public/images/`:

- `brand/` — original logos and brand marks
- `hero/` — hero photos and background artwork
- `featured/` — featured episode thumbnails
- `pillars/` — artwork for the five pillars
- `programs/` — programme images
- `founder/` — founder portrait
- `footer/` — footer and participation-banner artwork
- `incoming/` — unsorted assets to organize later

The existing `public/images/sakafat-logo.png` remains the header's current logo. New originals can go in `brand/`; replacing the displayed logo is a separate change. Keep mockup PDFs in `mockups/`, outside the publicly served image folder. Everything in `public/` is publicly accessible when deployed.

## Landing-page hero

`src/components/home/hero-section.tsx` uses the supplied hero artwork and episode image without modifying the originals. Desktop has two columns and an angled decorative card; mobile stacks copy, buttons, and artwork. The hero heading uses Montserrat ExtraBold 800 at 36px on desktop, 100% line-height, and 1% letter spacing, scaling down on smaller screens. CTA labels use Poppins Bold 700 at 16px, 100% line-height, and zero letter spacing. The decorative artwork uses 60% opacity.

`pillarsHref`, `participateHref`, and `episodeHref` can enable the corresponding actions once their destinations exist. All are currently inactive; the episode is inactive by request. The episode label is embedded in the supplied PNG; the component provides its accessible hit area.

## Featured episodes

`src/components/home/featured-section.tsx` renders the three featured cards using assets from `public/images/featured/`. It uses three columns on desktop, two on tablet, and one on mobile. Card copy follows `mockups/Featured by Sakafat.pdf`; typography uses the established Poppins family pending section-specific specs.

Episode play buttons and View All Episodes are inactive by request. Add `href` values to the typed episode data and pass `allEpisodesHref` when destinations are ready. No video player or API integration has been added.
