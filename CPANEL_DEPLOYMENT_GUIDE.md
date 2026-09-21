# Sakafat Global — cPanel Deployment Guide (via GitHub Actions)

This guide details how to deploy **Sakafat Global** (Next.js 16 + Django 6 + PostgreSQL) to **cPanel Shared Hosting** using automated **GitHub Actions CI/CD over SSH**, following the exact production pattern used for **DeepSkills**.

---

## 1. Architecture Overview

In cPanel shared hosting, applications run under **Phusion Passenger**:
- **Frontend (Next.js 16)**: Managed via cPanel **"Setup Node.js App"** running Node 22 LTS with `app.js` / `server.js`.
- **Backend (Django 6 REST API)**: Managed via cPanel **"Setup Python App"** running Python 3.12 with `passenger_wsgi.py`.
- **Database**: PostgreSQL (or MySQL) hosted directly on cPanel.
- **Automated CI/CD**: GitHub Actions runs automated tests for both Next.js and Django, builds a clean source bundle, connects over SSH, installs dependencies on the server, runs migrations, atomically symlinks the new release, and tests the health endpoint with **automatic rollback on failure**.

```
 GitHub Actions Runner
       │
       ├─► 1. Run Frontend Tests (npm test, lint, typecheck)
       ├─► 2. Run Backend Tests (python manage.py test)
       ├─► 3. Package Clean Bundle (scripts/package-cpanel.js)
       │
       ▼ (Secure SSH / SCP)
 cPanel Server (/home/USER/sakafat-app/)
       │
       ├── shared/
       │     ├── frontend.env   (Next.js production env)
       │     ├── backend.env    (Django production env)
       │     └── media/         (Persistent user uploads)
       │
       ├── releases/
       │     ├── <release-id-1>/
       │     └── <release-id-2>/ (Newly extracted release)
       │
       ├── current  ──►  Symlink to latest release
       └── tmp/restart.txt (Touched to trigger Passenger restart)
```

---

## 2. GitHub Secrets and Variables

Configure these in **GitHub → Repository Settings → Secrets and variables → Actions**:

### Repository Secrets:
| Secret Name | Description | Example |
|---|---|---|
| `DEPLOY_SSH_KEY` | Private SSH key authorized in cPanel | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### Repository Variables:
| Variable Name | Description | Example |
|---|---|---|
| `DEPLOY_HOST` | Server domain or IP | `sakafat.com` |
| `DEPLOY_USER` | cPanel username | `sakafatuser` |
| `DEPLOY_PORT` | SSH Port (usually 22 or custom port like 2222) | `22` |
| `DEPLOY_APP_ROOT` | Absolute path to the private app folder | `/home/sakafatuser/sakafat-app` |
| `DEPLOY_NODE_BIN` | Path to Node.js 22 binary folder in cPanel | `/opt/cpanel/ea-nodejs22/bin` |
| `DEPLOY_PYTHON_BIN` | Path to Python 3.12 virtualenv bin directory | `/home/sakafatuser/virtualenv/sakafat-backend/3.12/bin` |
| `DEPLOY_HEALTH_URL` | Full URL to test application health | `https://sakafat.com/api/health/` |

---

## 3. One-Time cPanel Server Setup

Connect to your server via SSH (or use cPanel Terminal):

### Step 1: Create Directory Layout
```bash
# Define your application root
APP_ROOT=/home/YOUR_CPANEL_USER/sakafat-app

mkdir -p $APP_ROOT/releases
mkdir -p $APP_ROOT/shared
mkdir -p $APP_ROOT/shared/media
mkdir -p $APP_ROOT/tmp
```

### Step 2: Create Shared Environment Files
Inside `$APP_ROOT/shared/`:

#### 1. `$APP_ROOT/shared/frontend.env`:
```ini
NEXT_PUBLIC_API_BASE_URL=https://sakafat.com/api/
DJANGO_API_BASE_URL=http://127.0.0.1:8000/api/
```

#### 2. `$APP_ROOT/shared/backend.env`:
```ini
SECRET_KEY=generate-a-strong-random-64-character-key
DEBUG=False
ALLOWED_HOSTS=sakafat.com,api.sakafat.com,127.0.0.1,localhost

DB_NAME=YOUR_CPANEL_USER_sakafat
DB_USER=YOUR_CPANEL_USER_dbuser
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
MAIL_MAILER=smtp
MAIL_HOST=mail.sakafat.com
MAIL_PORT=587
MAIL_USERNAME=noreply@sakafat.com
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@sakafat.com
MAIL_FROM_NAME="Sakafat Global"

CORS_ALLOWED_ORIGINS=https://sakafat.com
```

Secure the permissions:
```bash
chmod 600 $APP_ROOT/shared/frontend.env
chmod 600 $APP_ROOT/shared/backend.env
```

---

### Step 3: Register Applications in cPanel

#### A. Frontend (Next.js)
1. Open cPanel **"Setup Node.js App"**.
2. Click **Create Application**:
   - **Node.js version**: `22.x`
   - **Application mode**: `Production`
   - **Application root**: `sakafat-app/current/frontend`
   - **Application URL**: `sakafat.com` (or your chosen domain)
   - **Application startup file**: `app.js`
3. Click **Create**.

#### B. Backend (Django API)
1. Open cPanel **"Setup Python App"**.
2. Click **Create Application**:
   - **Python version**: `3.12`
   - **Application root**: `sakafat-app/current/backend/saqaft`
   - **Application URL**: `api.sakafat.com` (or subpath)
   - **Application startup file**: `passenger_wsgi.py`
3. Click **Create**.
4. Note down the path to Python virtualenv binary (e.g. `/home/YOUR_USER/virtualenv/sakafat-backend/3.12/bin`) and set it in your GitHub repository variable `DEPLOY_PYTHON_BIN`.

---

## 4. How to Deploy via GitHub Actions

### Automatic Deployment:
Every push or merge to the `main` branch automatically runs full frontend and backend tests.

### To Deploy to Production:
1. Go to **GitHub → Actions → "Verify and Deploy to cPanel"**.
2. Click **Run workflow** on the `main` branch.
3. Check the box **"Deploy release to cPanel production"**.
4. Click **Run workflow**.

### What the Workflow Does:
1. **Runs Verification**:
   - Runs `npm test`, `npm run lint`, and `npm run typecheck` on frontend.
   - Runs `python manage.py check` and `python manage.py test` on backend.
2. **Builds Source Package**:
   - Runs `node scripts/package-cpanel.js` to create a lightweight zip without cache or local secrets.
3. **Deploys to cPanel over SSH**:
   - Runs preflight verification on the server.
   - Unzips release to `releases/<release-id>/`.
   - Symlinks `shared/frontend.env`, `shared/backend.env`, and `shared/media/`.
   - Runs `npm ci` and `npm run build` for Next.js.
   - Runs `pip install`, `python manage.py migrate`, and `python manage.py collectstatic` for Django.
   - Atomically switches the `current` symlink to the new release.
   - Restarts Phusion Passenger by touching `tmp/restart.txt`.
   - Polls `https://sakafat.com/api/health/` to verify the new release is live.
   - **Auto-Rollback**: If the health check fails, the symlink automatically rolls back to the previous release without downtime.

---

## 5. Alternative: Manual Deployment (Without GitHub Actions)

If you ever need to deploy manually from your local machine:

1. **Package the bundle locally**:
   ```bash
   node scripts/package-cpanel.js
   ```
   This generates `sakafat-cpanel-bundle.zip`.

2. **Upload to cPanel**:
   - In cPanel File Manager, upload `sakafat-cpanel-bundle.zip` to `/home/YOUR_USER/sakafat-app/`.
   - Extract it into a new folder in `releases/<release-date>/`.
   - Symlink `shared/frontend.env` into `frontend/.env.production`.
   - Symlink `shared/backend.env` into `backend/saqaft/.env`.
   - Symlink `shared/media` into `backend/saqaft/media`.

3. **Build & Migrate via cPanel Terminal**:
   ```bash
   cd /home/YOUR_USER/sakafat-app/releases/<release-date>/sakafat-app/frontend
   npm ci
   npm run build

   cd ../backend/saqaft
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py collectstatic --noinput
   ```

4. **Switch symlink & restart**:
   ```bash
   ln -sfn releases/<release-date>/sakafat-app /home/YOUR_USER/sakafat-app/current
   touch /home/YOUR_USER/sakafat-app/tmp/restart.txt
   ```

---

## 6. Post-Deployment Verification

After deployment, verify the following:
- [ ] **Health Endpoint**: `https://sakafat.com/api/health/` returns `{"status":"ok","runtime":"node"}`.
- [ ] **Frontend**: `https://sakafat.com/en` and `/ur` render correctly.
- [ ] **Admin Portal**: `https://sakafat.com/admin/` or `https://api.sakafat.com/admin/` loads with static CSS intact.
- [ ] **Contact Form**: Test sending an inquiry on `/en/contact`.
