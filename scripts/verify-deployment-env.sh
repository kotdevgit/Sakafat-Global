#!/usr/bin/env bash
# ==============================================================================
# Sakafat Global — Production Environment Pre-Flight Verifier
# ==============================================================================
# Validates frontend and backend production environment files before deployment
# to catch misconfigurations, insecure secrets, or missing variables.
#
# Usage:
#   bash scripts/verify-deployment-env.sh [frontend_env] [backend_env]
#   bash scripts/verify-deployment-env.sh --example
# ==============================================================================

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--example" ]]; then
  FE_ENV="$ROOT_DIR/frontend/.env.production.example"
  BE_ENV="$ROOT_DIR/backend/saqaft/.env.production.example"
  IS_EXAMPLE=1
else
  FE_ENV="${1:-$ROOT_DIR/frontend/.env.production}"
  BE_ENV="${2:-$ROOT_DIR/backend/saqaft/.env}"
  IS_EXAMPLE=0
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0
warn_count=0

pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; ((pass_count++)); }
fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; ((fail_count++)); }
warn() { echo -e "  ${YELLOW}! WARN${NC}: $1"; ((warn_count++)); }
info() { echo -e "  ${BLUE}ℹ INFO${NC}: $1"; }

get_val() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

echo "=================================================================="
echo "Sakafat Global — Production Environment Verification"
echo "=================================================================="
echo "Frontend env: $FE_ENV"
echo "Backend env:  $BE_ENV"
echo ""

# ------------------------------------------------------------------------------
# 1. Frontend Verification
# ------------------------------------------------------------------------------
echo "--- 1. Checking Frontend Environment ---"
if [[ ! -f "$FE_ENV" ]]; then
  fail "Frontend environment file not found: $FE_ENV"
else
  pass "Frontend environment file exists"

  pub_api=$(get_val "$FE_ENV" "NEXT_PUBLIC_API_BASE_URL")
  if [[ -z "$pub_api" ]]; then
    fail "NEXT_PUBLIC_API_BASE_URL is missing or empty"
  elif [[ ! "$pub_api" =~ ^https?:// ]]; then
    fail "NEXT_PUBLIC_API_BASE_URL must start with http:// or https://: $pub_api"
  else
    pass "NEXT_PUBLIC_API_BASE_URL is valid ($pub_api)"
  fi

  django_api=$(get_val "$FE_ENV" "DJANGO_API_BASE_URL")
  if [[ -z "$django_api" ]]; then
    fail "DJANGO_API_BASE_URL is missing or empty"
  elif [[ ! "$django_api" =~ ^https?:// ]]; then
    fail "DJANGO_API_BASE_URL must start with http:// or https://: $django_api"
  else
    pass "DJANGO_API_BASE_URL is valid ($django_api)"
  fi
fi

echo ""

# ------------------------------------------------------------------------------
# 2. Backend Verification
# ------------------------------------------------------------------------------
echo "--- 2. Checking Backend Environment ---"
if [[ ! -f "$BE_ENV" ]]; then
  fail "Backend environment file not found: $BE_ENV"
else
  pass "Backend environment file exists"

  # DEBUG check
  debug=$(get_val "$BE_ENV" "DEBUG")
  debug_lower=$(echo "$debug" | tr '[:upper:]' '[:lower:]')
  if [[ "$debug_lower" == "false" || "$debug_lower" == "0" ]]; then
    pass "DEBUG is False (production safe)"
  else
    if [[ $IS_EXAMPLE -eq 1 ]]; then
      warn "DEBUG is '$debug'"
    else
      fail "DEBUG must be False in production (currently: '$debug')"
    fi
  fi

  # SECRET_KEY check
  secret=$(get_val "$BE_ENV" "SECRET_KEY")
  if [[ -z "$secret" ]]; then
    fail "SECRET_KEY is missing or empty"
  elif [[ "$secret" =~ (your-secret-key|replace-|placeholder|changeme) ]]; then
    if [[ $IS_EXAMPLE -eq 1 ]]; then
      pass "SECRET_KEY placeholder present in example template"
    else
      fail "SECRET_KEY is using an insecure default or placeholder"
    fi
  elif [[ ${#secret} -lt 40 ]]; then
    warn "SECRET_KEY length (${#secret}) is short. Recommended 50+ characters."
  else
    pass "SECRET_KEY is configured with sufficient entropy (${#secret} chars)"
  fi

  # ALLOWED_HOSTS check
  hosts=$(get_val "$BE_ENV" "ALLOWED_HOSTS")
  if [[ -z "$hosts" ]]; then
    fail "ALLOWED_HOSTS is missing or empty"
  else
    pass "ALLOWED_HOSTS is configured: $hosts"
  fi

  # CSRF_TRUSTED_ORIGINS check
  csrf=$(get_val "$BE_ENV" "CSRF_TRUSTED_ORIGINS")
  if [[ -z "$csrf" ]]; then
    warn "CSRF_TRUSTED_ORIGINS is empty (required for Django 4+ admin POST over HTTPS)"
  elif [[ ! "$csrf" =~ https?:// ]]; then
    fail "CSRF_TRUSTED_ORIGINS must include schemes (e.g. https://domain.com): $csrf"
  else
    pass "CSRF_TRUSTED_ORIGINS configured: $csrf"
  fi

  # Database check
  db_name=$(get_val "$BE_ENV" "DB_NAME")
  db_user=$(get_val "$BE_ENV" "DB_USER")
  db_pass=$(get_val "$BE_ENV" "DB_PASSWORD")
  db_host=$(get_val "$BE_ENV" "DB_HOST")
  db_port=$(get_val "$BE_ENV" "DB_PORT")

  if [[ -z "$db_name" || -z "$db_user" || -z "$db_pass" || -z "$db_host" ]]; then
    fail "One or more database settings (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST) are missing"
  else
    pass "Database settings present ($db_user@$db_host:$db_port/$db_name)"
  fi

  # Email check
  email_backend=$(get_val "$BE_ENV" "EMAIL_BACKEND")
  mail_host=$(get_val "$BE_ENV" "MAIL_HOST")
  mail_user=$(get_val "$BE_ENV" "MAIL_USERNAME")
  mail_pass=$(get_val "$BE_ENV" "MAIL_PASSWORD")

  if [[ "$email_backend" == *"filebased"* ]]; then
    warn "EMAIL_BACKEND is filebased. Emails will not be delivered to users over SMTP."
  else
    if [[ -z "$mail_host" || -z "$mail_user" || -z "$mail_pass" ]]; then
      warn "SMTP settings (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD) are partially missing"
    else
      pass "SMTP configuration is populated ($mail_user@$mail_host)"
    fi
  fi
fi

echo ""
echo "=================================================================="
echo -e "Results: ${GREEN}$pass_count passed${NC}, ${RED}$fail_count failed${NC}, ${YELLOW}$warn_count warnings${NC}"
echo "=================================================================="

if [[ $fail_count -gt 0 ]]; then
  echo -e "${RED}Production deployment pre-flight failed. Resolve the failures above before deploying.${NC}"
  exit 1
else
  echo -e "${GREEN}Production environment check completed successfully!${NC}"
  exit 0
fi
