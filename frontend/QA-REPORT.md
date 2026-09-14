# Frontend QA — 15 September 2026

Local frontend QA completed against `http://localhost:3010`. No deployment or backend changes were made.

## Coverage

All ten routes returned HTTP 200 and were checked at viewport widths of 320, 390, 768, 1024, and 1440 pixels:

- `/`
- `/programs`
- `/contact`
- `/get-involved`
- `/about`
- `/pillars/idraak`
- `/pillars/rabta`
- `/pillars/ikhlakiat`
- `/pillars/falah`
- `/pillars/sama`

No horizontal page overflow or headings/paragraphs extending outside the viewport was detected. Every route has one main landmark and one H1. No duplicate IDs or missing image alt attributes were found. All rendered images loaded after scrolling through the pages. Representative desktop and mobile screenshots were visually inspected for typography, artwork, cards, and form layout.

## Fixes made

- Enabled homepage links to the pillars section, Get Involved, and all programmes.
- Enabled programme-page links to Get Involved and Contact.
- Enabled footer Open pathways and Partner with us links.
- Preserved the existing appearance of these actions and added visible keyboard focus styles where needed.
- Made homepage, pillar-detail, and Get Involved hero artwork load eagerly after the browser reported delayed above-the-fold image loading.

## Verified interactions

- Homepage hero Pillars action and mobile navigation land at the pillars section; the mobile menu closes.
- Each of the five pillar cards opens the correct detail page at scroll position zero. Each breadcrumb returns to the homepage pillars anchor.
- Newly enabled navigation links reach their intended local pages.
- All seven participation accordions open with Enter and close with Space; multiple panels can also remain open.
- Mobile navigation opens and closes, and Escape returns focus to the menu toggle.
- Programme filters show 2 Open Now, 1 Upcoming, 3 In Development, and 6 All Programmes, with matching pressed state and live result text.
- Contact Get Started reaches the form. Invalid email input is detected by native validation, enquiry selection works, and Send remains disabled. Only synthetic test text was entered; no enquiry was submitted.
- Unknown page and pillar URLs return HTTP 404.
- Fresh browser navigation checks produced no console errors or warnings. Earlier rapid scrolling produced development LCP advisories for below-the-fold pillar photos; these photos retain lazy loading.

## Build checks

`npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed after the changes.

## Remaining handoff items

- Enquiry submission, uploads, login, Urdu, episode links, programme registration/detail actions, creator applications, social links, governance pages, and About Learn More actions remain inactive pending their implementation or destinations.
- Confirm the footer phone number (`111 222 3333 00`), identical Mission/Vision copy, and the repeated “ethics” in the homepage pillar text. Supplied copy was preserved.
- This is local browser QA with responsive viewport emulation, not physical-device or cross-browser certification. Safari/Firefox, screen-reader auditing, backend delivery, and deployed-site performance were not tested.
- No claim of pixel-perfect PDF comparison or full accessibility compliance is made.
