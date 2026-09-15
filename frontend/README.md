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

## Shared typography

Typography roles live in `src/app/globals.css`. Use the `--type-*` font tokens in component styles instead of adding independent sizes or breakpoint overrides. Section headings use Montserrat 700 at 42px/60px on desktop, 34px on tablet, and 28px on mobile. Page heroes use Montserrat 700 at 52px/65px on desktop. Poppins is used for body copy (16px), card descriptions (14px), card titles (18px bold), labels (14px medium), captions (12px), primary actions (16px bold), and compact actions (12px medium).

Approved exceptions: the homepage hero retains Montserrat 800 at 36px with 1% letter spacing; its buttons retain 16px bold with 100% line height. Contact’s Get Started keeps Poppins 500 at 17.39px with 161% line height. Navigation retains Poppins 400 at 16px with 100% line height. The small Featured by Sakafat heading is treated as a section label.

## Login and registration

- `/login`, `/register`, and `/verify-email` use the shared Sakafat authentication design. Registration requires email verification before login.
- The header Login link opens `/login`; after login it becomes Account, with a sign-out action on that page.
- Browser forms call same-origin `/api/auth/login`, `/api/auth/register`, and `/api/auth/verify`. Next forwards the expected fields to Django's `login/`, `register/`, and `verify_otp/` endpoints using `NEXT_PUBLIC_API_BASE_URL` (set before building). This avoids browser CORS requests for authentication.
- Django remains the authority for passwords, users, OTP verification, and protected data. The frontend sets the returned access JWT in an HTTP-only, SameSite=Lax cookie, Secure in production, with a maximum lifetime of 30 minutes. Tokens are not returned to browser JavaScript or stored in localStorage. The session endpoint is only a UI hint; future protected requests must send the cookie token to Django for validation.
- Refresh tokens are not retained because Django does not expose a refresh endpoint yet. Users log in again after expiration. Sign out clears the local access cookie; backend token revocation is not implemented.
- Password-reset pages and OTP resend are not included. No backend files were changed.
- Missing backend configuration shows an unavailable-service message. Live registration, email delivery, and database-backed login still require backend setup and verification.

Run isolated route checks with `npm test`. These mock Django responses and never create accounts, store enquiries, or send emails. `tests/auth-routes.test.mjs` covers secure cookie handling, origin checks, field errors, offline responses, email verification, registration, expiry, and logout. `tests/contact-route.test.mjs` covers the enquiry form.

## Password reset

- `/forgot-password` collects the email, then the code and the new password on one step. The browser calls same-origin `/api/auth/forgot-password` and `/api/auth/reset-password`; Next forwards both to Django.
- Django validates the code at the reset step itself, so the single-step form works without a separate verify call. `verify-reset-otp/` still exists for API clients and is validated the same way.
- Reset codes expire after 10 minutes and allow 5 wrong attempts before the code is burned. A new code cannot be requested more than once a minute.
- `forgot-password` replies identically whether or not the email has an account, so it cannot be used to discover registered addresses. Wrong codes and unknown emails return the same message.
- A successful reset blacklists the account's outstanding refresh tokens, signing other sessions out.

## Episodes

- Episodes are managed in the Django admin at `/admin/Episode/episode/`, the same way programmes are.
- Categories are rows, not code: add them at `/admin/Episode/episodecategory/` and they are immediately selectable, with no migration or deploy. A category still used by an episode cannot be deleted. Programme **pillars** stay a fixed list in the model, because the five pillars are a brand constant and the card colours key off them.
- The API exposes a category as its **slug** plus a display **label**, so renaming a category in the admin changes what readers see without changing the public data shape.
- The homepage "Featured by Sakafat" section reads published episodes from Django's `episode/` endpoint through `src/lib/api/episodes.ts`, revalidated every 60 seconds. Unchecking **is active** removes an episode from the homepage.
- Card order follows the **position** field, lowest first. **Image alt** is the screen-reader description; leave it blank only when the title already says everything.
- The play button stays disabled until **video url** is set, matching the original design.
- The homepage hero's photo and link both come from the **first episode by position**. The episode's own image is cropped to the hero's portrait shape, and the "Latest Episode" pill is real markup over it, so it translates and scales. The link uses that episode's video url and stays disabled while the field is empty.
- Each episode can carry an optional **portrait image** for the hero. When the featured episode has one it is used as-is; otherwise the hero centre-crops the card image; and if the episode has no artwork at all, the supplied hero PNG is used. Only the first episode reaches the hero, so a portrait is worth preparing for the one being featured rather than for every episode.
- The hero uses the featured episode's photo whenever it has one, at any size. A card-sized image still works but looks soft, because the portrait crop is upscaled; upload at least 1040x1188 for a sharp result. The episode list in the admin shows each image's dimensions and marks the low-res ones, so you can see which to replace. The supplied artwork is used only when an episode has no image at all.
- Uploaded images are served from Django's `/media/`, so `next.config.ts` allows that origin for `next/image`. It is derived from `DJANGO_API_BASE_URL`, and the local-IP override it needs in development is enabled only when that host is loopback.

## Programmes

- Programmes are managed in the Django admin at `/admin/Programme/programme/`. Create a superuser with `python manage.py createsuperuser` in `backend/saqaft/`.
- The homepage section and `/programs` read published programmes from Django's `programme/` endpoint through `src/lib/api/programmes.ts`, revalidated every 60 seconds. Unchecking **is active** in the admin removes a programme from the public site; staff see unpublished ones through the API.
- Card colours come from the programme's **pillar**, not its slug, so a programme added in the admin is styled without new CSS. An uploaded image replaces the banner gradient and is shown behind a scrim. Programmes without a recognised pillar fall back to a neutral slate theme.
- Card order follows the **position** field, lowest first.
- If Django is unreachable, both pages render with an "details are being updated" message rather than failing. Programme content is not duplicated in the frontend any more.

## Contact enquiries

- The contact form posts to same-origin `/api/contact`, which forwards the enquiry to Django's `contact/` endpoint as multipart form data. Django stores the enquiry and emails the sender an acknowledgement.
- Browser field names are mapped to Django's model fields in the route handler (`fullName` to `full_name`, `phone` to `phone_number`, `location` to `country_city`, `portfolio` to `relevant_link`). Update both sides together if either changes.
- The route rejects cross-origin submissions, enforces the required fields and the enquiry types the form offers, requires the consent checkbox, and limits attachments to 5 MB. Django validates again and is the authority. Only a confirmation message is returned to the browser; the stored record is not echoed back.
- Organisation, phone number, country and city, relevant link, and attachment are optional, matching the form design.
