# Sakafat Global — Backend

Reserved for the backend team’s Python Django application, backed by PostgreSQL.

Django has not been scaffolded yet. The backend team will provide dependencies, setup commands, models, migrations, authentication, and API endpoints here. PostgreSQL runs as a separate database service; do not commit database files or credentials.

Coordinate API URLs, response types, authentication, CORS, and CSRF settings with the frontend team. The frontend lives in `../frontend/` and reads its API URL from `NEXT_PUBLIC_API_BASE_URL`.


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

### Programmes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programme/` | View all programmes |
| POST | `/programme/` | Create a programme (Admin only) |
| GET | `/programme/<id>/` | View a single programme |
| PUT | `/programme/<id>/` | Update a programme (Admin only) |
| PATCH | `/programme/<id>/` | Partially update a programme (Admin only) |
| DELETE | `/programme/<id>/` | Delete a programme (Admin only) |

Users can view programmes, while Admin/Staff users can perform CRUD operations.

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
