# Sakafat Global — Frontend Technical Documentation

Comprehensive architectural and engineering documentation for the **Sakafat Global Next.js Frontend**.

---

## 1. Executive Overview & System Architecture

### 1.1 Purpose & Scope
**Sakafat Global** is a modern bilingual cultural and digital media platform dedicated to heritage preservation, creative programming, and cultural discourse. The frontend application provides a fast, accessible, bilingual (English and Urdu) digital experience with seamless media discovery, program participation pathways, and community engagement.

### 1.2 Architecture Model: Backend-for-Frontend (BFF) Proxy
The frontend is architected as a **Next.js App Router** application acting as both the presentation layer and a secure Backend-for-Frontend (BFF) proxy:

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                     │
│  - English (LTR) / Urdu (RTL)                           │
│  - Zero direct client-side requests to Django           │
│  - No tokens or secrets stored in localStorage/session  │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP / Same-Origin
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Frontend (Node.js 22+)             │
│                                                         │
│  ┌───────────────────────┐   ┌───────────────────────┐  │
│  │   App Router /[lang]  │   │  API Route Handlers   │  │
│  │  - Server Components  │   │  - /api/auth/[action] │  │
│  │  - Static & ISR Pages │   │  - /api/contact       │  │
│  │  - Client Components  │   │  - /api/health        │  │
│  └───────────┬───────────┘   └───────────┬───────────┘  │
│              │                           │              │
│              │   Server-Side Fetch       │              │
│              │   (DJANGO_API_BASE_URL)   │              │
└──────────────┼───────────────────────────┼──────────────┘
               ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│             Django REST Framework (Backend)             │
│  - /episode/, /programme/, /contact/                    │
│  - /login/, /register/, /verify_otp/, /token/refresh/   │
│  - PostgreSQL Database & Media Storage (/media/)        │
└─────────────────────────────────────────────────────────┘
```

#### Core Architectural Principles:
1. **Zero Direct Client-to-Django Communication**: The browser interacts exclusively with Next.js same-origin endpoints. There are no CORS credentials or cross-origin preflight requests from browser JavaScript.
2. **HTTP-Only Cookie Authentication**: JWT access and refresh tokens returned by Django are sealed in `httpOnly`, `SameSite=lax`, `Secure` cookies (`sakafat_access` and `sakafat_refresh`). JavaScript cannot read or leak tokens.
3. **Graceful Offline Degradation**: All public pages render cleanly even when the Django backend is offline or unmigrated, displaying polite status indicators rather than crashing (500).
4. **Bilingual First-Class Citizen**: URL-driven localization (`/[lang]`) guarantees that every page has a deterministic canonical URL in both English (`/en`) and Urdu (`/ur`).

---

## 2. Technology Stack & Specifications

| Layer / Concern | Technology | Version | Description / Role |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.3.5` | React framework (App Router, Server Components, Route Handlers) |
| **UI Library** | React & React DOM | `19.2.8` | Component rendering engine |
| **Language** | TypeScript | `^5` | Strict static typing throughout the codebase |
| **Styling** | Tailwind CSS & PostCSS | `^4` (`@tailwindcss/postcss`) | Base reset & utilities combined with CSS Modules |
| **Component Styles** | CSS Modules | Standard | Scoped component styling (`*.module.css`) |
| **Typography** | `next/font/google` | Built-in | Poppins (Latin), Montserrat (Headings), Noto Nastaliq Urdu (Urdu) |
| **Testing** | Node Test Runner | Node `>=22` | Native unit and route tests (`node --test tests/*.test.mjs`) |
| **Linting** | ESLint & `eslint-config-next` | `^9` / `16.3.5` | Code quality and React/Next best practices |
| **Runtime Target** | Node.js | `>=22.0.0` | Node.js runtime environment |

---

## 3. Directory Structure & Organization

```
frontend/
├── .env.example               # Template for environment variables
├── .env.local                 # Local development environment configuration
├── next.config.ts             # Next.js runtime configuration (remote image patterns, etc.)
├── package.json               # Dependencies and build scripts
├── postcss.config.mjs         # PostCSS configuration for Tailwind v4
├── tsconfig.json              # TypeScript compiler configuration
├── public/                    # Static assets served at root
│   ├── images/
│   │   ├── about/             # Artwork, hero backgrounds, mission/vision icons
│   │   ├── brand/             # Brand identity and logos
│   │   ├── featured/          # Fallback featured episode thumbnails
│   │   ├── footer/            # Footer icons and social logos
│   │   ├── get-involved/      # Participation banners and SVGs
│   │   ├── hero/              # Homepage hero backgrounds
│   │   ├── pillars/           # 5 pillar calligraphy and photography assets
│   │   ├── programs/          # Programme banners and graphics
│   │   └── sakafat-logo.png   # Main navigation brand mark
├── scripts/
│   └── translate-dictionary.mjs # Script to seed machine-translated Urdu drafts
├── tests/                     # Isolated test suites using Node test runner
│   ├── auth-routes.test.mjs   # Authentication endpoints & cookie tests
│   ├── contact-route.test.mjs # Contact form submission & validation tests
│   ├── hero-episode.test.mjs  # Episode selection & fallback tests
│   ├── i18n.test.mjs          # Dictionary symmetry & locale tests
│   ├── open-programme.test.mjs# Open programme filter tests
│   ├── validation.test.mjs    # Field validation rules tests
│   └── helpers/               # Test mocks and utilities
└── src/
    ├── proxy.ts               # Locale negotiation & redirect middleware
    ├── app/
    │   ├── [lang]/            # Bilingual App Router tree
    │   │   ├── layout.tsx     # Root HTML, fonts, providers, header & footer
    │   │   ├── page.tsx       # Homepage
    │   │   ├── globals.css    # Global typography tokens, RTL rules & keyframes
    │   │   ├── about/         # About Us page
    │   │   ├── accessibility/ # Accessibility Statement
    │   │   ├── contact/       # Contact & enquiry form page
    │   │   ├── creator-network/# Creator Network landing
    │   │   ├── editorial-charter/# Editorial Charter page
    │   │   ├── forgot-password/# Password reset page
    │   │   ├── get-involved/  # Participation pathways page
    │   │   ├── login/         # User login page
    │   │   ├── pillars/[slug]/# Individual Pillar detail pages (5 pillars)
    │   │   ├── privacy/       # Privacy Notice page
    │   │   ├── programs/      # Programs directory page
    │   │   │   └── [slug]/    # Individual Program detail page
    │   │   └── register/      # User registration & verification page
    │   └── api/               # Next.js Route Handlers (BFF Proxy)
    │       ├── auth/[action]/ # Auth actions proxy (login, register, session, etc.)
    │       ├── contact/       # Contact form multipart submission proxy
    │       └── health/        # Service health check endpoint
    ├── components/            # Modular React components by feature
    │   ├── about/             # About page components & public promises
    │   ├── auth/              # Authentication forms, page shells, & context
    │   ├── contact/           # Contact hero and validated multi-field form
    │   ├── creator-network/   # Creator Network layout & grid
    │   ├── get-involved/      # Interactive pathways accordion
    │   ├── home/              # Homepage sections (Hero, Featured, Pillars, etc.)
    │   ├── i18n/              # LanguageSwitch and LocaleLink
    │   ├── layout/            # SiteHeader, SiteFooter, SiteMotion, PillarsLink
    │   ├── legal/             # LegalPageLayout for charter, privacy, a11y
    │   ├── pillars/           # Pillar detail layout, data, scroll-to-top
    │   └── programs/          # Programme cards, hero, detail view, discovery
    └── lib/                   # Utility libraries and services
        ├── api/               # Django API client, endpoints, and error handling
        │   ├── config.ts      # Base URL validation
        │   ├── episodes.ts    # Episode fetching & hero selector
        │   ├── programmes.ts  # Programme fetching & status filters
        │   └── unavailable.ts # Graceful fallback logging
        ├── i18n/              # Internationalization configuration
        │   ├── config.ts      # Locales, RTL mapping, route helpers
        │   ├── context.tsx    # I18n React Context provider & hook
        │   ├── dictionary.ts  # Dictionary loader & interpolation helper
        │   ├── request.ts     # Request locale resolver for Route Handlers
        │   ├── server.ts      # Server Component locale helpers
        │   └── dictionaries/  # Translation JSON files
        │       ├── en.json    # Complete English copy dictionary
        │       └── ur.json    # Complete Urdu copy dictionary
        └── validation/        # Shared validation schemas & sanitizers
            ├── auth.ts        # Auth form validation & error messages
            ├── contact.ts     # Contact form validation & error messages
            └── filter.ts      # Input sanitization & character limits
```

---

## 4. Internationalization (i18n) & RTL System

### 4.1 Supported Locales
- **`en`** (English) — Default locale, Left-to-Right (`ltr`).
- **`ur`** (Urdu) — Right-to-Left (`rtl`), rendered in Nastaliq script.

### 4.2 Locale Resolution & Routing (`src/proxy.ts`)
All pages reside under the dynamic route segment `/[lang]`. If a visitor lands on a route without a locale (e.g. `/programs` or `/`):
1. **Saved Preference**: Checks the `sakafat_locale` cookie.
2. **Browser Preference**: Parses the `Accept-Language` header, matching `ur` or `ur-PK` to Urdu.
3. **Fallback**: Defaults to `en`.
4. **Redirect**: Performs a clean 307 redirect to `/${locale}${pathname}` while preserving query strings.

The proxy matcher excludes Next.js internals (`_next`), API routes (`/api`), and static assets in `/public` matching file extensions:
```ts
export const config = {
  matcher: ["/((?!api|_next|.*\\.[^/]+$).*)"],
};
```

### 4.3 Dictionary Architecture (`src/lib/i18n/`)
- Dictionaries are stored in `en.json` and `ur.json`.
- Typed access is provided via `getDictionary(locale: Locale)`.
- Client components consume the dictionary using `useI18n()`.
- Server components fetch dictionaries directly via `getDictionary(await getLocale())`.
- Dynamic message interpolation uses `format(template, { key: value })`.

### 4.4 RTL & Typography Engineering
Urdu typography requires specialized handling because **Noto Nastaliq Urdu** has a sloping baseline, large descenders, and distinct vertical metrics compared to Latin fonts:

1. **Font Token Switching in `globals.css`**:
   ```css
   [lang="ur"] body {
     --font-poppins: var(--font-nastaliq);
     --font-montserrat: var(--font-nastaliq);
     --leading-tight: 1.75;
     --leading-snug: 1.9;
     --leading-normal: 2;
     --leading-relaxed: 2.05;
     --section-leading: 1.7;
     --hero-leading: 1.6;
     font-family: var(--font-nastaliq), serif;
   }
   ```
2. **Direction Exceptions for Inputs**:
   While the page is RTL in Urdu, international inputs (emails, phone numbers, passwords, OTPs, URLs) must remain LTR:
   ```css
   [lang="ur"] input[type="email"],
   [lang="ur"] input[type="tel"],
   [lang="ur"] input[type="url"],
   [lang="ur"] input[type="password"],
   [lang="ur"] input[name="username"],
   [lang="ur"] input[name="otp"] {
     direction: ltr;
     text-align: start;
   }
   ```
3. **Numeric Counters**:
   Counters such as `"0 / 100"` are wrapped in `dir="ltr"` so that the neutral slash character (`/`) is not flipped by bidirectional reordering in RTL mode.

---

## 5. Backend Integration & API Layer

### 5.1 Environment Configuration
| Variable | Scope | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `DJANGO_API_BASE_URL` | Server-only | Private base URL for Next.js server to call Django | `http://127.0.0.1:8000/api/` |
| `NEXT_PUBLIC_API_BASE_URL` | Client & Build | Fallback public URL (never put secrets here) | `http://127.0.0.1:8000/api/` |
| `RELEASE_ID` | Server-only | Deployment release tag reported by `/api/health` | `v1.0.4` |

### 5.2 Image Handling & Next.js Image Optimization
Django serves uploaded media from `/media/`. In `next.config.ts`, `remotePatterns` is configured dynamically from `DJANGO_API_BASE_URL`:
- Allows remote patterns for `/media/**`.
- Enables `dangerouslyAllowLocalIP` **only** when running against loopback addresses (`127.0.0.1`, `localhost`) in development, preventing SSRF vulnerabilities in production.

### 5.3 Authentication Lifecycle (`src/app/api/auth/[action]/route.ts`)

```
Browser               Next.js Route Handler (/api/auth)             Django Backend
   │                                  │                                    │
   ├────── POST /api/auth/login ─────►│                                    │
   │      (username, password)        ├────── POST /login/ ───────────────►│
   │                                  │      (JSON body)                   │
   │                                  │◄───── 200 OK (access, refresh) ────┤
   │◄───── 200 OK + Set-Cookie ───────┤                                    │
   │       sakafat_access (30 min)    │                                    │
   │       sakafat_refresh (24 hr)    │                                    │
   │                                  │                                    │
   ├────── GET /api/auth/session ────►│                                    │
   │       (Cookies sent)             ├────── GET /me/ (Bearer token) ────►│
   │                                  │◄───── 200 OK (user payload) ───────┤
   │◄───── { authenticated: true } ───┤                                    │
```

#### Token Refresh Strategy:
1. When `sakafat_access` has expired but `sakafat_refresh` is present, `GET /api/auth/session` calls Django's `token/refresh/` endpoint.
2. If valid, both cookies are reissued with fresh tokens, preventing visitor interruption mid-session.
3. On `/api/auth/logout`, both cookies are cleared locally (`maxAge: 0`).

### 5.4 Data Fetching & ISR Strategy
- **Episodes (`src/lib/api/episodes.ts`)**:
  - Fetched via `GET ${DJANGO_API_BASE_URL}episode/` with header `Accept-Language: locale`.
  - Cached with `next: { revalidate: 60 }` (refreshed every 60 seconds).
  - Automatically resolves localized fields: `title_ur`, `description_ur`, `category_label_ur`, `image_alt_ur`.
- **Programmes (`src/lib/api/programmes.ts`)**:
  - Fetched via `GET ${DJANGO_API_BASE_URL}programme/` with `next: { revalidate: 60 }`.
  - Individual programme fetched via `programme/${encodeURIComponent(slug)}/`.
  - Automatic fallback to empty list or `null` if Django is unreachable.

---

## 6. Page Specifications & Features

### 6.1 Homepage (`/[lang]`)
- **Hero Section (`<HeroSection />`)**:
  - Automatically displays the **first published episode** by position.
  - Prefers `heroImageUrl` (520x594 portrait crop) over `imageUrl`.
  - Action buttons link to `#pillars` and `/get-involved`.
  - Video play button is active only if `videoUrl` is present.
- **Featured Section (`<FeaturedSection />`)**:
  - Renders 3 featured episode cards with category pills, titles, and descriptions.
  - Links out to the Sakafat YouTube channel (`https://www.youtube.com/@sakafat-global`).
- **Pillars Section (`<PillarsSection />`)**:
  - Visual presentation of the 5 cultural pillars with custom calligraphy assets.
- **Programs Section (`<ProgramsSection />`)**:
  - Displays currently open and active programmes fetched from Django.
- **Founder Section (`<FounderSection />`)**:
  - Narrative on the platform's founder and cultural mandate.
- **Incoming Section (`<IncomingSection />`)**:
  - Teaser for upcoming digital initiatives and creator opportunities.

### 6.2 About Us (`/[lang]/about`)
- **Belief & Identity**: Interactive visual layout highlighting key verbs and cultural commitments.
- **Mission & Vision**: SVG-backed purpose cards.
- **Public Promises (`<PublicPromises />`)**: 4 foundational institutional promises (Authenticity, Inclusivity, Excellence, Preservation).
- **Governance Link**: Direct link to the Editorial Charter.

### 6.3 Programs Directory (`/[lang]/programs` & `/[lang]/programs/[slug]`)
- **Discovery Grid (`<ProgramsDiscovery />`)**:
  - Client-side interactive filter tabs: `"All Programmes"`, `"Open Now"`, `"Upcoming"`, `"In Development"`.
  - Dynamic status pills color-coded by cultural pillar.
  - Accessible card states and empty-state messaging when no programmes match.
- **Detail View (`<ProgramDetailView />`)**:
  - SSR page with `generateStaticParams()` pre-rendering known slugs.
  - Detailed overview, pillar association, participation instructions, and direct enquiry linking.

### 6.4 Cultural Pillars (`/[lang]/pillars/[slug]`)
Dedicated detail pages for the 5 cultural pillars:
1. **Idraak (ادراک)** — Consciousness & Cultural Awareness
2. **Rabta (رابطہ)** — Connection & Community Bridges
3. **Ikhlakiat (اخلاقیات)** — Ethics, Values & Integrity
4. **Falah (فلاح)** — Well-being, Progress & Elevation
5. **Sama (سماع)** — Listening, Reflection & Resonance

Features:
- Dual-image layout: Custom calligraphy artwork and contextual heritage photography.
- Localized commentary and philosophical significance.
- `<ScrollToTop />` floating helper.

### 6.5 Get Involved (`/[lang]/get-involved`)
- **Interactive Pathways Accordion**:
  - 7 engagement pathways: Story Submissions, Guest Appearances, Creator Collaborations, Studio Partnerships, Production Proposals, Programme Enrollment, and Strategic Alliances.
  - Expanding `<details>` elements with smooth CSS keyword interpolation (`interpolate-size: allow-keywords`).
  - Deep-links to `/contact` with pre-filled query parameters (e.g. `?type=creative&subject=Guest+Appearance`).

### 6.6 Creator Network (`/[lang]/creator-network`)
- Dedicated community hub for filmmakers, writers, traditional artists, and researchers.
- Information on grants, co-productions, and distribution support.

### 6.7 Contact & Enquiry (`/[lang]/contact`)
- **Contextual Prefill**: Reads `?type=` and `?subject=` from URL search params.
- **Auto-Scroll**: Automatically scrolls and shifts focus to `<form>` if arriving with pre-filled query parameters.
- **Live Client Validation**: Real-time feedback for required fields, email syntax, phone format, and 5MB attachment limits.
- **CSRF & Origin Guard**: Rejects cross-origin submissions.

### 6.8 Legal & Governance Pages
Built with `<LegalPageLayout />`:
- **Editorial Charter (`/[lang]/editorial-charter`)**: Editorial independence, fact-checking, and cultural integrity standards.
- **Privacy Notice (`/[lang]/privacy`)**: Data collection, cookie policies, and user privacy rights.
- **Accessibility Statement (`/[lang]/accessibility`)**: WCAG 2.1 AA conformance targets, keyboard navigation, and screen reader accommodations.

---

## 7. Form Handling & Validation System

All form schemas, character caps, and validation rules are centralized in `src/lib/validation/`:

### 7.1 Validation Schema Overview
| Module | Validated Fields | Rules / Constraints |
| :--- | :--- | :--- |
| **`contact.ts`** | `fullName` | Required, 2–100 characters |
| | `email` | Required, valid RFC email pattern, max 254 chars |
| | `enquiryType` | Must match recognized types (`general`, `creative`, `press`, `partnership`, `support`) |
| | `subject` | Required, 3–150 characters |
| | `message` | Required, 10–2000 characters |
| | `phone` | Optional, international phone format (`+?[\d\s\-().]{7,20}`) |
| | `attachment` | Optional, max 5 MB (`maxAttachmentBytes = 5 * 1024 * 1024`) |
| | `consent` | Required boolean check (`true`) |
| **`auth.ts`** | `username` | 3–30 chars, alphanumeric + underscores |
| | `email` | Standard email format |
| | `password` | Min 8 characters, complexity check |
| | `otp` | 6-digit numeric verification code |
| **`filter.ts`** | Sanitization | Strips control characters, normalizes Unicode whitespace |

---

## 8. UI Components & Design System

### 8.1 Design Tokens (`globals.css`)
```css
/* Typography Roles */
--type-hero: normal 700 52px/65px var(--font-montserrat);
--type-section: normal 700 42px/60px var(--font-montserrat);
--type-card: normal 700 18px/1.4 var(--font-poppins);
--type-body: normal 400 16px/1.61 var(--font-poppins);
--type-small: normal 400 14px/1.61 var(--font-poppins);
--type-button: normal 700 16px/1.4 var(--font-poppins);

/* Core Palette */
--bg-primary: #faf9f6;    /* Warm alabaster */
--text-primary: #24251f;  /* Deep charcoal */
```

### 8.2 Motion & Animation System (`SiteMotion`)
- Implemented as a zero-dependency progressive enhancement via `src/components/layout/site-motion.tsx`.
- Uses `IntersectionObserver` to trigger animations when elements enter the viewport:
  - `[data-enter]`: Hero entry animations (`motion-rise`, `motion-fade`, `motion-zoom`).
  - `[data-reveal]`: Scroll-triggered reveal animations with staggered `--reveal-index` delays.
  - Automatically respects user OS settings (`prefers-reduced-motion: reduce`).

### 8.3 Accessibility (a11y) Features
- **Skip Links**: Accessible `#main-content` skip-to-content anchor in `<SiteHeader />`.
- **Focus Management**: Clean focus indicators, escape-key menu dismissals, trap-prevention.
- **Screen Reader Announcements**: Semantic landmarks (`<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`).
- **High Contrast Ratios**: Adherence to WCAG 2.1 AA standards for text and interactive controls.

---

## 9. Testing & Quality Assurance

The frontend includes a native Node.js test suite with zero third-party testing bloat:

```sh
npm test
```

### Test Suites (`frontend/tests/`):
1. **`auth-routes.test.mjs`**:
   - Validates `/api/auth/[action]` handlers.
   - Tests cookie parsing, SameSite and Secure flags, session refresh, and unauthenticated states.
2. **`contact-route.test.mjs`**:
   - Tests multipart form handling, file size rejection (>5MB), origin verification, and field error mapping.
3. **`hero-episode.test.mjs`**:
   - Verifies episode sorting, hero photo selection logic, and fallback behaviour when no hero image is provided.
4. **`i18n.test.mjs`**:
   - Guarantees dictionary symmetry (every key in `en.json` exists in `ur.json` and vice versa).
   - Validates path generation and locale prefix stripping.
5. **`open-programme.test.mjs`**:
   - Tests programme filtering logic and CTA target selection.
6. **`validation.test.mjs`**:
   - Tests field rules, boundary cases, and string sanitization.

---

## 10. Development & Deployment Guide

### 10.1 Local Development Workflow
```sh
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies cleanly
npm ci

# 3. Configure local environment variables
cp .env.example .env.local

# 4. Start local development server (port 3000)
npm run dev
```

### 10.2 Build & Verification Commands
```sh
# Type check TypeScript and generate Next route types
npm run typecheck

# Run linter
npm run lint

# Run all test suites
npm test

# Build production bundle
npm run build

# Start production server
npm start
```

### 10.3 Production Deployment Notes
1. **Node Version**: Ensure Node.js `>= 22.0.0` is active.
2. **Reverse Proxy / Passenger**: For cPanel or Nginx deployments, `app.js` and `server.js` provide entry points compatible with Phusion Passenger or standalone Node process managers.
3. **Environment Secrets**: Never commit `.env.local`. Set `DJANGO_API_BASE_URL` in the production environment settings.
