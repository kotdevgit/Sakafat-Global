# Sakafat Global — Backend Technical Documentation

Comprehensive architectural and engineering documentation for the **Sakafat Global Django REST Framework Backend**.

---

## 1. Executive Overview & System Architecture

### 1.1 Purpose & Scope
The **Sakafat Global Backend** provides the core business logic, relational data persistence, editorial content management, authentication/authorization services, and transactional communication for the Sakafat Global platform.

It is implemented as a modular **Django 6.1.1** and **Django REST Framework 3.18.1** application backed by **PostgreSQL**, with JWT token authentication via **SimpleJWT** and a modern administration portal powered by **Django Unfold**.

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│               Next.js Frontend (BFF Layer)              │
│  - Calls /api/* via server-side fetch                   │
│  - Transmits Bearer tokens or proxies requests          │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP / HTTPS (JSON / Multipart)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Django Application Layer                │
│                                                         │
│  ┌───────────────────┐  ┌─────────────────────────────┐ │
│  │   Security & CORS │  │    Django REST Framework    │ │
│  │   - corsheaders   │  │    - JWT Authentication     │ │
│  │   - CsrfView      │  │    - Custom Permissions     │ │
│  └───────────────────┘  └──────────────┬──────────────┘ │
│                                        │                │
│  ┌─────────────────────────────────────┴──────────────┐ │
│  │                   Domain Apps                      │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │ │
│  │  │     User     │ │  Programme   │ │  Episode   │  │ │
│  │  │ (Auth & OTP) │ │  (Catalog)   │ │  (Media)   │  │ │
│  │  └──────────────┘ └──────────────┘ └────────────┘  │ │
│  │  ┌──────────────┐ ┌─────────────────────────────┐  │ │
│  │  │   Contact    │ │    Django Unfold Admin      │  │ │
│  │  │  (Enquiries) │ │    (Content & Operations)   │  │ │
│  │  └──────────────┘ └─────────────────────────────┘  │ │
│  └──────────────────────────────┬─────────────────────┘ │
└─────────────────────────────────┼───────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Persistence Layer                    │
│  - PostgreSQL (Relational Database via psycopg 3)       │
│  - Media Storage (/media/ for uploads & artwork)        │
│  - SMTP / Local File Email Backend                      │
└─────────────────────────────────────────────────────────┘
```

#### Core Architectural Principles:
1. **Server-to-Server Trust Model**: The Django API is designed primarily to be consumed by the Next.js server-side BFF. `CORS_ALLOWED_ORIGINS` remains restricted by default.
2. **Timing-Safe & Isolated Authentication**: All OTP verifications and password resets use timing-safe comparison (`secrets.compare_digest`), row-level database locking (`select_for_update()`), rate-limiting, and attempt limits (5 max).
3. **Draft / Active Quarantine**: Unpublished programmes and episodes (`is_active=False`) are strictly filtered out of public queries at the database level and are visible only to authenticated staff users.
4. **Resilient Transactional Messaging**: Contact enquiries and registrations are wrapped in atomic transactions. If the mail server is temporarily unreachable during contact submission, the record is safely retained in the database while logging the failure.

---

## 2. Technology Stack & Dependencies

| Component / Layer | Technology | Version | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Django | `6.1.1` | Web framework, ORM, migrations, and routing |
| **API Framework** | Django REST Framework (DRF) | `3.18.1` | Serializers, ViewSets, API views, and parsers |
| **Authentication** | `djangorestframework-simplejwt` | `5.5.1` | JSON Web Token (JWT) issuing, rotation, and blacklisting |
| **Database Driver** | `psycopg` / `psycopg-binary` | `3.3.5` | High-performance PostgreSQL driver (Psycopg 3) |
| **Image Processing** | Pillow | `12.3.0` | Dimension verification, image format validation, and inspection |
| **Admin UI** | `django-unfold` | `0.107.0` | Tailwind-based responsive administration theme |
| **Configuration** | `python-decouple` | `3.8` | Environment variable parsing (`.env`) |
| **CORS Middleware** | `django-cors-headers` | `4.9.0` | Cross-Origin Resource Sharing control |
| **Database** | PostgreSQL | `15+` | Primary relational database |
| **Python Runtime** | Python | `>= 3.12` | Runtime execution environment |

---

## 3. Directory Structure & App Layout

```
backend/
├── .local/
│   └── emails/                # Local file-based email storage during development
├── AUTH-QA.md                 # Verification and QA audit log for auth flows
├── README.md                  # Quickstart and endpoint overview
└── saqaft/                    # Django project root
    ├── manage.py              # CLI management script
    ├── requirements.txt       # Frozen Python dependencies
    ├── .env.example           # Environment configuration template
    ├── saqaft/                # Project configuration package
    │   ├── __init__.py
    │   ├── asgi.py            # ASGI application entry point
    │   ├── settings.py        # Master settings (DB, JWT, Unfold, Email, etc.)
    │   ├── urls.py            # Root URL routing & media serving
    │   └── wsgi.py            # WSGI application entry point
    ├── User/                  # Authentication, OTPs & User Management
    │   ├── models.py          # OTPVerification & PasswordResetOTP models
    │   ├── serializers.py     # Registration, login, OTP & reset serializers
    │   ├── views.py           # Auth API views (Register, Login, OTP, Reset, Me)
    │   ├── urls.py            # /api/ routes for authentication
    │   ├── admin.py           # Unfold User, Group & OTP admin definitions
    │   └── tests.py           # 25+ automated tests for auth security flows
    ├── Programme/             # Cultural Programmes Catalog
    │   ├── models.py          # Programme model (pillars, status, slug, etc.)
    │   ├── serializer.py      # ProgrammeSerializer with bilingual translation
    │   ├── views.py           # ProgrammeViewSet with slug/pk lookup
    │   ├── permissions.py     # Read-only public, write staff permissions
    │   ├── urls.py            # /api/programme/ router
    │   ├── admin.py           # Unfold Programme admin with status filters
    │   └── tests.py           # Tests for status choices, permissions, and seeding
    ├── Episode/               # Media Episodes & Categories
    │   ├── models.py          # Episode & EpisodeCategory models with dimension tracking
    │   ├── serializer.py      # EpisodeSerializer with bilingual resolution
    │   ├── views.py           # EpisodeViewSet with slug/pk lookup
    │   ├── permissions.py     # Read-only public, write staff permissions
    │   ├── urls.py            # /api/episode/ router
    │   ├── admin.py           # Unfold Episode admin with hero resolution badges
    │   └── tests.py           # Tests for category renaming, hero crop, and queries
    └── Contact/               # Contact & Enquiry Submissions
        ├── models.py          # Contact model (enquiry types, consent, file)
        ├── serializer.py      # ContactSerializers with file & choice validation
        ├── views.py           # ContactViewSet with transactional mail dispatch
        ├── permissions.py     # Create-only public, staff-only management
        ├── urls.py            # /api/contact/ router
        ├── admin.py           # Unfold Contact message list and inspection
        └── tests.py           # Tests for file limits, mail resilience, and validation
```

---

## 4. Application Modules & Domain Models

### 4.1 `User` App — Authentication, OTPs & Account Security

#### Models (`User/models.py`)
1. **`OTPVerification`**:
   - `user`: Foreign key to `auth.User` (`CASCADE`).
   - `otp`: 6-digit numeric string.
   - `attempts`: Count of incorrect submission attempts (max 5).
   - `created_at`: Timestamp for expiry calculation (10-minute TTL).
   - `is_verified`: Boolean flag indicating completion.
2. **`PasswordResetOTP`**:
   - `user`: Foreign key to `auth.User` (`CASCADE`).
   - `otp`: 6-digit numeric string.
   - `attempts`: Count of incorrect submission attempts (max 5).
   - `created_at`: Timestamp for expiry calculation (1-minute TTL).
   - `is_verified`: Boolean flag.

#### Security & Workflow Rules (`User/views.py`)
* **Registration**:
  - `POST /api/register/` creates an inactive user (`is_active=False`) within an atomic transaction and generates a cryptographically random OTP (`secrets.randbelow(900000) + 100000`).
* **Verification & Activation**:
  - `POST /api/verify_otp/` enforces a database row lock using `select_for_update()`.
  - Uses `secrets.compare_digest()` to thwart timing attacks.
  - Rejects attempts if `attempts >= 5` or code is older than 10 minutes.
  - Upon successful verification, sets `user.is_active = True`.
* **Login & Verification Interception**:
  - `POST /api/login/` validates credentials. If the credentials match an inactive account, it returns HTTP 403 with `code: "ACCOUNT_NOT_VERIFIED"` and the username, allowing the frontend to redirect directly to the OTP screen without showing a confusing "invalid credentials" error.
* **Token Invalidation on Password Reset**:
  - `POST /api/reset-password/` validates the OTP directly at the reset step, updates the password, and calls `_revoke_refresh_tokens(user)` to blacklist all active refresh tokens in `rest_framework_simplejwt.token_blacklist`.

---

### 4.2 `Programme` App — Cultural Initiatives & Pathways

#### Models (`Programme/models.py`)
```python
class Programme(models.Model):
    name = models.CharField(max_length=200)
    name_ur = models.CharField(max_length=200, blank=True, default="")
    slug = models.SlugField(unique=True)
    pillar = models.CharField(max_length=20, choices=PILLAR_CHOICES)
    description = models.TextField()
    description_ur = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    image = models.ImageField(upload_to="programmes/", blank=True, null=True)
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### Status & Pillar Choices
* **Status Choices**:
  - `open` ("Open" / "کھلا ہے")
  - `register_interest` ("Register Interest" / "دلچسپی درج کرائیں")
  - `upcoming` ("Upcoming" / "جلد آ رہا ہے")
  - `development` ("In Development" / "زیرِ تیاری")
* **Pillar Choices**:
  - `ikhlakiat` ("Ikhlakiat" / "اخلاقیات")
  - `idraak` ("Idraak" / "ادراک")
  - `falah` ("Falah" / "فلاح")
  - `rabta` ("Rabta" / "رابطہ")
  - `sama` ("Sama" / "سماع")

#### Bilingual Representation (`Programme/serializer.py`)
`ProgrammeSerializer.to_representation()` inspects the incoming `Accept-Language` header or `?lang=` query parameter. If `ur` is present:
- `name` is replaced with `name_ur` (if populated).
- `description` is replaced with `description_ur`.
- `pillar_label` and `status_label` are replaced with their Urdu dictionary equivalents.

---

### 4.3 `Episode` App — Video, Podcasts & Hero Artwork

#### Models (`Episode/models.py`)
1. **`EpisodeCategory`**:
   - Editable editorial taxonomy managed in the Django Admin without code migrations.
   - `name`, `name_ur`, `slug` (unique), and `position`.
2. **`Episode`**:
   - `title`, `title_ur`, `slug` (unique).
   - `category`: Foreign key to `EpisodeCategory` (`on_delete=models.PROTECT`).
   - `image`: Standard card artwork. Automatically populates `image_width` and `image_height`.
   - `hero_image`: Optional upright portrait image for the homepage hero card, populating `hero_image_width` and `hero_image_height`.
   - `image_alt`, `image_alt_ur`: Accessible screen-reader descriptions.
   - `video_url`: External or streaming video link.
   - `position`: Numeric ordering (lowest first).
   - `is_active`: Publication state.

#### Image Dimension & Quality Guard
`EpisodeAdmin` in `Episode/admin.py` enforces minimum resolution guidelines:
- **`HERO_MIN_WIDTH = 1040`**, **`HERO_MIN_HEIGHT = 1188`**.
- Flags uploads in the admin table:
  - `"— cropped from card image"` when no dedicated portrait is uploaded.
  - `"{width}x{height} · not portrait"` if a landscape image is uploaded as a hero portrait.
  - `"{width}x{height} · low-res"` if dimensions fall below the threshold.

---

### 4.4 `Contact` App — Inquiries & Collaboration Proposals

#### Models (`Contact/models.py`)
- `full_name`: Sender's name (max 150 chars).
- `organisation`: Optional organization/company name (max 200 chars).
- `email`: Validated email address.
- `phone_number`: Optional contact number.
- `country_city`: Optional location string.
- `enquiry_type`: Choice field (`general`, `partnership`, `programme`, `creative`, `media`, `other`).
- `subject`: Inquiry title (max 100 chars).
- `message`: Full inquiry body.
- `relevant_link`: Optional portfolio or project URL.
- `attachment`: Optional file upload (`upload_to="enquiries/"`).
- `consent`: Boolean flag affirming data processing consent.

#### Transactional Email Dispatch (`Contact/views.py`)
When a contact form is submitted via `POST /api/contact/`:
1. The record is saved in PostgreSQL.
2. An acknowledgement email is dispatched to the submitter (`contact.email`).
3. An admin notification email containing full submission details (name, email, phone, organisation, location, type, subject, message, links/attachments, and admin portal direct link) is dispatched to administrator(s) specified in `CONTACT_NOTIFICATION_EMAIL`.
4. If the mail server encounters an `SMTPException` or `OSError` for either email, the failure is logged (`logger.exception`) but **the HTTP 201 response is still returned**, ensuring visitor submissions are never lost due to external mail transport errors.

---

### 4.5 Branded Transactional Email System

All outgoing transactional communications are rendered as **multipart emails** (`text/plain` and `text/html`) using custom Django templates that adhere to the Sakafat Global brand guidelines:

* **Design Palette & Aesthetics**:
  - **Header**: Deep Teal (`#21474B`) with crisp uppercase wordmark "SAKAFAT GLOBAL" and subtitle "Preserving & Celebrating Cultural Heritage".
  - **Accent Stripe**: 3px Ruby Red rule (`#A20E19`) separating the header from the content.
  - **Canvas & Container**: Warm off-white background (`#FAF9F6`) with a centered 600px white card (`#FFFFFF`), rounded borders (`#E5E7EB`), and subtle elevation.
  - **Footer**: Brand description, navigation links (`#007D7E`), and copyright.

* **Template Directory Structure (`backend/saqaft/templates/emails/`)**:
  - `base_email.html`: Responsive master layout with table-based structure for bulletproof rendering across Gmail, Apple Mail, Outlook, and mobile devices.
  - `contact_user_acknowledgement.html`: Visitor confirmation email featuring personalized greeting, enquiry type badge, subject confirmation, and an "Explore Programmes" button.
  - `contact_admin_notification.html`: Administrator notification featuring a 2-column details table (name, mailto email, phone, organisation, location, type, subject), highlighted message box, attachment notice, and direct link to the Django Unfold Admin portal.
  - `auth_otp.html`: Authentication OTP template used across registration, resend OTP, and password reset, featuring a high-contrast 6-digit code box (`letter-spacing: 10px`, monospace font, dashed teal border), expiration time badge, and security notice.

---

## 5. API Endpoints Reference

Base URL: `http://127.0.0.1:8000/api/`

### 5.1 Authentication Endpoints (`User`)

| Method | Path | Access | Request Body | Success Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register/` | Public | `username`, `email`, `password` | `201 Created` | Creates inactive user; emails 6-digit OTP |
| `POST` | `/verify_otp/` | Public | `username`, `otp` | `200 OK` | Verifies OTP and activates account |
| `POST` | `/resend_otp/` | Public | `username` | `200 OK` / `429` | Rate-limited (1 request / 60 sec) |
| `POST` | `/login/` | Public | `username`, `password` | `200 OK` (access, refresh) | Returns 403 `ACCOUNT_NOT_VERIFIED` if unverified |
| `POST` | `/token/refresh/` | Public | `refresh` | `200 OK` (access, refresh) | Rotates and blacklists old refresh tokens |
| `GET` | `/me/` | Bearer Token | None | `200 OK` (`id`, `username`, `email`) | Returns authenticated profile |
| `POST` | `/forgot-password/` | Public | `email` | `200 OK` | Sends reset OTP; uniform response against enumeration |
| `POST` | `/verify-reset-otp/`| Public | `email`, `otp` | `200 OK` | Optional pre-verification of reset code |
| `POST` | `/reset-password/` | Public | `email`, `otp`, `new_password` | `200 OK` | Updates password and blacklists all refresh tokens |

### 5.2 Programmes Endpoints (`Programme`)

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/programme/` | Public | List all active programmes (Staff see inactive too) |
| `POST` | `/programme/` | Staff / Admin | Create a new programme |
| `GET` | `/programme/<id or slug>/` | Public | Retrieve a programme by primary key or slug |
| `PUT` | `/programme/<id or slug>/` | Staff / Admin | Full update of a programme |
| `PATCH` | `/programme/<id or slug>/` | Staff / Admin | Partial update of a programme |
| `DELETE` | `/programme/<id or slug>/` | Staff / Admin | Delete a programme |

### 5.3 Episodes Endpoints (`Episode`)

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/episode/` | Public | List all active episodes ordered by `position` |
| `POST` | `/episode/` | Staff / Admin | Create a new episode |
| `GET` | `/episode/<id or slug>/` | Public | Retrieve an episode by primary key or slug |
| `PUT` | `/episode/<id or slug>/` | Staff / Admin | Full update of an episode |
| `PATCH` | `/episode/<id or slug>/` | Staff / Admin | Partial update of an episode |
| `DELETE` | `/episode/<id or slug>/` | Staff / Admin | Delete an episode |

### 5.4 Contact Endpoints (`Contact`)

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/contact/` | Public | Submit an inquiry (supports multipart file uploads) |
| `GET` | `/contact/` | Staff / Admin | List all inquiries |
| `GET` | `/contact/<id>/` | Staff / Admin | View specific inquiry |
| `DELETE` | `/contact/<id>/` | Staff / Admin | Delete an inquiry |

---

## 6. Administration Portal (Django Unfold)

The administration interface is customized using **Django Unfold**, replacing the stock Django admin with a modern, responsive layout styled in the brand's primary teal (`#007d7e` / `rgb(0, 125, 126)`).

### 6.1 Unfold Sidebar Configuration
The admin dashboard is structured into three logical sections:
1. **Content**:
   - **Programmes** (`diversity_3` icon) — Manage initiatives, status, and pillar assignments.
   - **Episodes** (`podcasts` icon) — Manage video and audio content, position, and artwork.
   - **Episode Categories** (`category` icon) — Dynamic taxonomy management.
2. **Enquiries**:
   - **Contact Messages** (`mail` icon) — Review incoming collaboration and general inquiries.
3. **People & Access**:
   - **Users** (`person` icon) — User management styled via Unfold's `UserAdmin`.
   - **Groups** (`group` icon) — Permission groups.
   - **Signup OTPs** (`pin` icon) — Audit log of active and expired registration OTPs.
   - **Password Reset OTPs** (`lock_reset` icon) — Audit log of password reset attempts.

---

## 7. Security, Permissions & Error Handling

### 7.1 Cross-Origin Resource Sharing (CORS)
- In production, `CORS_ALLOWED_ORIGINS` is configured to only allow requests from the frontend domain.
- The browser communicates with Django through the Next.js server-side proxy; therefore, direct browser cross-origin requests are denied by default.

### 7.2 Rate Limiting & Brute-Force Prevention
- **Signup OTP Resend**: Enforces a 60-second cooldown per account (`HTTP 429 Too Many Requests`).
- **Reset OTP Requests**: Enforces a 60-second cooldown per email address.
- **Attempt Throttling**: Limits OTP verification to 5 attempts before burning the code.
- **Timing Attacks**: Validates codes using constant-time string comparisons (`secrets.compare_digest`).

### 7.3 Data Protection & Integrity
- Foreign keys from `Episode` to `EpisodeCategory` use `on_delete=models.PROTECT` to prevent deleting categories that still have associated episodes.
- Deleting or updating user credentials invalidates all outstanding JWT refresh tokens immediately.

---

## 8. Database Migrations & Seeding

The database includes built-in data migrations that seed initial production content:
* **`Programme/migrations/0002_seed_programmes.py`**:
  Seeds foundational programmes (*Sakafat Signals 01.0*, *Lawtency*, *Confidence*, *Career*, *Minds*, *Sama*).
* **`Episode/migrations/0002_seed_episodes.py`** & **`0004_move_categories_to_lookup.py`**:
  Seeds default categories (*Documentary*, *Dialogue*, *Performance*) and foundational episodes with associated media assets.

---

## 9. Testing & Quality Assurance

The backend includes a comprehensive test suite built on Django's `TestCase` and DRF's `APITestCase`:

### Running Tests:
```bash
cd backend/saqaft
./.venv/bin/python manage.py test
```

### Test Coverage Highlights:
1. **`User/tests.py`**:
   - Registration, verification, login, and identity verification.
   - Brute-force attempt limits (5 attempts) and code expiration.
   - Single-step password reset security and prevention of token replay.
   - Blacklisting of refresh tokens upon password reset.
   - Account-isolated OTP lookup (preventing cross-account activation).
2. **`Programme/tests.py`**:
   - Anonymous read access to published programmes.
   - Quarantine of unpublished (`is_active=False`) programmes from non-staff.
   - Ordering by `position`.
   - Bilingual display label resolution.
   - Dual lookup by integer ID and slug.
3. **`Episode/tests.py`**:
   - Category slug stability during renames.
   - Hero artwork dimension validation and fallback cropping.
   - Staff-only draft visibility.
4. **`Contact/tests.py`**:
   - Multipart submission and file attachment storage.
   - Resilience against SMTP mail outages.
   - Consent validation and choice validation.

---

## 10. Local Setup & Production Deployment

### 10.1 Local Development Setup
```bash
# 1. Navigate to project root
cd backend/saqaft

# 2. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your DB credentials, SECRET_KEY, and mail configuration

# 5. Run migrations
python manage.py migrate

# 6. Create superuser for Unfold admin
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver 127.0.0.1:8000
```

### 10.2 Production Environment Variables (`.env`)
| Variable | Description | Recommended Setting |
| :--- | :--- | :--- |
| `DEBUG` | Django debug mode | `False` |
| `SECRET_KEY` | Cryptographic signing key | Long random string |
| `ALLOWED_HOSTS` | Permitted hostnames | `api.sakafat.com,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name | `sakafat_db` |
| `DB_USER` | PostgreSQL user | `sakafat_user` |
| `DB_PASSWORD` | PostgreSQL password | Strong password |
| `DB_HOST` | Database host | `127.0.0.1` or socket |
| `DB_PORT` | Database port | `5432` |
| `EMAIL_BACKEND` | Email backend class | `django.core.mail.backends.smtp.EmailBackend` |
| `MAIL_HOST` | SMTP server host | `smtp.mailgun.org` / `smtp.sendgrid.net` |
| `MAIL_PORT` | SMTP server port | `587` |
| `MAIL_USERNAME` | SMTP username | Account username |
| `MAIL_PASSWORD` | SMTP password | Account password |
| `MAIL_ENCRYPTION` | Encryption type | `tls` |
| `MAIL_FROM_ADDRESS`| Sender email address | `no-reply@sakafatglobal.com` |
| `CONTACT_NOTIFICATION_EMAIL`| Admin notification recipient(s) | `info@sakafatglobal.com` |
| `CORS_ALLOWED_ORIGINS`| Allowed frontend origins | `https://sakafatglobal.com` |
