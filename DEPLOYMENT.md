# Sakafat Global — Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Sakafat Global** platform in a production environment.

---

## 1. System Architecture Overview

Sakafat Global uses a **Backend-For-Frontend (BFF)** architecture:
- **Client (Browser)** interacts exclusively with the **Next.js frontend** (`https://yourdomain.com`).
- **Next.js (Node.js 22+)** serves bilingual Server Components, proxies API calls, and handles session cookies (`sakafat_access`, `sakafat_refresh`) server-side.
- **Django REST Framework (Python 3.12+)** runs behind **Gunicorn**, managing authentication, episodes, programmes, and enquiries.
- **PostgreSQL (16+)** stores application data.
- **Nginx** handles TLS termination, acts as the public reverse proxy, and efficiently serves static and uploaded media files.

```
 Internet (HTTPS)
       │
       ▼
 ┌───────────┐
 │   Nginx   │ (Port 80/443, SSL/TLS)
 └─────┬─────┘
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │   Next.js    │         │ Django (WSGI)│         │ Static/Media │
 │  (Port 3000) │         │ (Port 8000)  │         │ Direct Files │
 └──────┬───────┘         └──────┬───────┘         └──────────────┘
        │ (Server-to-Server)     │
        └────────────────────────┤
                                 ▼
                          ┌──────────────┐
                          │  PostgreSQL  │
                          └──────────────┘
```

---

## 2. Server Requirements

- **Operating System**: Ubuntu 22.04 LTS or 24.04 LTS (recommended)
- **CPU / RAM**: Minimum 2 vCPU, 4GB RAM (Next.js build & Django require at least 2GB during build/compile)
- **Disk**: 20GB+ SSD storage
- **Software**:
  - Python 3.12+ & `python3-venv`
  - Node.js 22.x LTS & `npm`
  - PostgreSQL 16+
  - Nginx
  - Certbot (Let's Encrypt)
  - PM2 (Process manager for Node.js) or Systemd

---

## 3. Production Environment Variables

### Backend Configuration (`backend/saqaft/.env`)
Create `/var/www/sakafat/backend/saqaft/.env`:

```ini
# Security
SECRET_KEY=generate-a-strong-random-64-character-secret-key
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com,127.0.0.1,localhost

# Database
DB_NAME=sakafat_production
DB_USER=sakafat_user
DB_PASSWORD=your-secure-db-password
DB_HOST=127.0.0.1
DB_PORT=5432

# Production Email (SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net  # or your SMTP provider
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="Sakafat Global"

# CORS (Frontend proxies server-side; keep empty or specify frontend domain)
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Frontend Configuration (`frontend/.env.production` or `.env.local`)
Create `/var/www/sakafat/frontend/.env.production`:

```ini
# Public API base (used for image resolution & public metadata)
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/

# Internal server-to-server endpoint used by Next.js Server Components & Route Handlers
DJANGO_API_BASE_URL=http://127.0.0.1:8000/api/
```

---

## 4. Production Deployment on Ubuntu VPS (Standard Setup)

### Step 1: Install System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib python3-venv python3-pip certbot python3-certbot-nginx

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step 2: Configure PostgreSQL
```bash
sudo -u postgres psql -c "CREATE DATABASE sakafat_production;"
sudo -u postgres psql -c "CREATE USER sakafat_user WITH PASSWORD 'your-secure-db-password';"
sudo -u postgres psql -c "ALTER ROLE sakafat_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE sakafat_user SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE sakafat_user SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sakafat_production TO sakafat_user;"
sudo -u postgres psql -d sakafat_production -c "GRANT ALL ON SCHEMA public TO sakafat_user;"
```

### Step 3: Clone Code & Configure Permissions
```bash
sudo mkdir -p /var/www/sakafat
sudo chown -R $USER:$USER /var/www/sakafat
cd /var/www/sakafat
git clone <your-repository-url> .
```

### Step 4: Setup Backend (Django & Gunicorn)
```bash
cd /var/www/sakafat/backend/saqaft

# 1. Virtual Environment & Dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# 2. Configure .env
cp .env.example .env
nano .env  # Update with production secrets and DB info

# 3. Migrations & Static Files
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

# 4. Permissions for media uploads
mkdir -p media
chmod -R 775 media
```

#### Create Systemd Service for Django (`/etc/systemd/system/sakafat-backend.service`):
```ini
[Unit]
Description=Sakafat Global Django Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sakafat/backend/saqaft
EnvironmentFile=/var/www/sakafat/backend/saqaft/.env
ExecStart=/var/www/sakafat/backend/saqaft/.venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/gunicorn-access.log \
    --error-logfile /var/log/gunicorn-error.log \
    saqaft.wsgi:application

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the backend service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sakafat-backend
sudo systemctl start sakafat-backend
sudo systemctl status sakafat-backend
```

---

### Step 5: Setup Frontend (Next.js & PM2)
```bash
cd /var/www/sakafat/frontend

# 1. Install dependencies
npm ci

# 2. Create production environment
cp .env.example .env.production
nano .env.production  # Set DJANGO_API_BASE_URL=http://127.0.0.1:8000/api/

# 3. Build Next.js
npm run build

# 4. Start with PM2
pm2 start npm --name "sakafat-frontend" -- start
pm2 save
pm2 startup
```

---

### Step 6: Configure Nginx & SSL

Create `/etc/nginx/sites-available/sakafat`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max upload size for enquiry attachments / episode images
    client_max_body_size 25M;

    # 1. Django Admin & API direct access
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Django Uploaded Media
    location /media/ {
        alias /var/www/sakafat/backend/saqaft/media/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 3. Django Static Files (for Django admin styling)
    location /django-static/ {
        alias /var/www/sakafat/backend/saqaft/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 4. Next.js Frontend (Handles all pages and /api BFF routes)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/sakafat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Obtain SSL certificate with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 5. Alternative: Containerized Deployment (Docker)

If deploying via Docker / Docker Compose:

### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY saqaft/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY saqaft/ /app/

EXPOSE 8000
CMD ["gunicorn", "--workers", "3", "--bind", "0.0.0.0:8000", "saqaft.wsgi:application"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 6. Pre-Flight Verification Checklist

Before opening the site to public traffic, verify:

1. [ ] **`DEBUG=False`** in `backend/saqaft/.env`.
2. [ ] **`SECRET_KEY`** is a unique, cryptographically strong random string.
3. [ ] **Database migrations** applied (`python manage.py migrate`).
4. [ ] **Admin account** created (`python manage.py createsuperuser`).
5. [ ] **`scripts/doctor.sh`** passes all checks:
   ```bash
   sh scripts/doctor.sh
   ```
6. [ ] **Email delivery** tested (submit an enquiry from `/en/contact` and ensure the acknowledgement email is received).
7. [ ] **Images rendering** (both English `/en` and Urdu `/ur` home and program pages show episode imagery correctly).
8. [ ] **HTTPS / SSL** is active and redirects from HTTP to HTTPS properly.

---

## 7. Ongoing Maintenance & Backups

### Daily Database Backup (Cron Job)
Add a cron job (`crontab -e`):
```bash
0 2 * * * pg_dump -U sakafat_user -h 127.0.0.1 sakafat_production | gzip > /var/backups/sakafat_db_$(date +\%F).sql.gz
```

### Media Directory Backup
Ensure `/var/www/sakafat/backend/saqaft/media/` is backed up regularly or stored on an S3-compatible bucket (e.g. AWS S3, Cloudflare R2, or DigitalOcean Spaces using `django-storages`).

### Log Rotation
Logs are recorded at:
- `/var/log/gunicorn-error.log`
- `/var/log/nginx/error.log`
- PM2 logs: `pm2 logs sakafat-frontend`
