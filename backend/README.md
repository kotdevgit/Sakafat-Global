# Sakafat Global — Backend

The Django REST Framework API behind the site, backed by PostgreSQL. The project
root is `saqaft/`, with four apps: **User** (registration, OTP, JWT, password
reset), **Programme**, **Episode**, and **Contact**.

Stack: Django 6.1.1, djangorestframework 3.18, SimpleJWT, psycopg 3, Pillow.
Full dependency list in `saqaft/requirements.txt`.

```bash
cd saqaft
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in DB_* and SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
./.venv/bin/python manage.py test    # builds and drops its own test database
```

Settings read from `saqaft/.env` via `python-decouple`; it is gitignored and must
stay that way — database credentials, `SECRET_KEY` and mail passwords live there.
`.env.example` selects Django's file-based mail backend, which writes messages to
`backend/.local/emails` instead of sending them; keep that locally, or every
registration fails when SMTP is unreachable.

Uploaded images are served from `/media/`. The browser does not call this API
directly — Next.js proxies every request server-side — so `CORS_ALLOWED_ORIGINS`
stays empty locally and deployments opt in explicitly. See the repository root
`README.md` for the full request flow.


## API Endpoints

Base URL:

http://127.0.0.1:8000/api/

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/` | Register a new user and send OTP to email |
| POST | `/verify_otp/` | Verify signup OTP and activate the account |
| POST | `/login/` | Login using username and password |
| POST | `/forgot-password/` | Send password reset OTP to email |
| POST | `/verify-reset-otp/` | Verify password reset OTP |
| POST | `/reset-password/` | Set a new password |
| POST | `/resend_otp/` | Send a fresh signup OTP |
| POST | `/token/refresh/` | Exchange a refresh token for a new access token |
| GET | `/me/` | The signed-in user (requires a bearer token) |

### Programmes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programme/` | List programmes |
| POST | `/programme/` | Create a programme (Admin only) |
| GET | `/programme/<id or slug>/` | View a single programme |
| PUT | `/programme/<id or slug>/` | Update a programme (Admin only) |
| PATCH | `/programme/<id or slug>/` | Partially update a programme (Admin only) |
| DELETE | `/programme/<id or slug>/` | Delete a programme (Admin only) |

Anyone can read; only Admin/Staff can write. A detail route accepts either the
numeric id or the slug, and the site links by slug.

**Unpublished programmes are hidden from everyone but staff.** The queryset is
filtered to `is_active=True` unless the request carries an authenticated staff
user, so unchecking **is active** in the admin removes a programme from the
public site and from the public API at once.

### Episodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/episode/` | List episodes |
| POST | `/episode/` | Create an episode (Admin only) |
| GET | `/episode/<id or slug>/` | View a single episode |
| PUT | `/episode/<id or slug>/` | Update an episode (Admin only) |
| PATCH | `/episode/<id or slug>/` | Partially update an episode (Admin only) |
| DELETE | `/episode/<id or slug>/` | Delete an episode (Admin only) |

Same permissions and same `is_active` filtering as programmes. An episode carries
`category` (the category's slug) alongside a read-only `category_label` (its
name), so renaming a category in the admin changes what readers see without
changing the public data shape. Categories are rows, editable at
`/admin/Episode/episodecategory/` with no migration or deploy.

### Contact

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/contact/` | Submit a contact/enquiry form |
| GET | `/contact/` | View contact submissions (Admin) |
| GET | `/contact/<id>/` | View a single contact submission (Admin) |
| PUT | `/contact/<id>/` | Update a contact submission |
| PATCH | `/contact/<id>/` | Partially update a contact submission |
| DELETE | `/contact/<id>/` | Delete a contact submission |

Users can submit contact forms, while Admin users can manage contact submissions.

### Authentication Flow

#### Registration

1. User submits username, email, and password.
2. Account is created as inactive.
3. An OTP is sent to the user's email.
4. User verifies the OTP.
5. Account becomes active.
6. User can then login using username and password.

#### Login

Login does not require OTP. The user provides username and password and receives JWT access and refresh tokens.

#### Password Reset

1. User submits their email.
2. Password reset OTP is sent to the email.
3. User verifies the OTP.
4. User submits a new password.
5. Password is updated successfully.

### JWT Authentication

Protected APIs use JWT authentication.

After login, include the access token in the request header:

`Authorization: Bearer <access_token>`

The refresh token can be used to obtain a new access token when the access token expires.
