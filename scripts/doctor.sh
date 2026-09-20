#!/bin/sh
# Reports why the Programmes or Episodes sections are empty.
# Prints no passwords or secrets — safe to paste into chat.
# Run from anywhere:  sh scripts/doctor.sh

cd "$(dirname "$0")/.." || exit 1
ROOT=$(pwd)
BE="$ROOT/backend/saqaft"
FE="$ROOT/frontend"
PY="$BE/.venv/bin/python"
ok=0; bad=0
pass() { echo "  OK    $1"; ok=$((ok+1)); }
fail() { echo "  FAIL  $1"; bad=$((bad+1)); }
info() { echo "        $1"; }

echo "=== Sakafat doctor ==="
echo "repo: $ROOT"
echo "commit: $(git rev-parse --short HEAD 2>/dev/null) on $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo

echo "1. Configuration files"
[ -f "$FE/.env.local" ] && pass "frontend/.env.local exists" || fail "frontend/.env.local MISSING  ->  cp frontend/.env.example frontend/.env.local"
[ -f "$BE/.env" ] && pass "backend/saqaft/.env exists" || fail "backend/saqaft/.env MISSING  ->  cp backend/saqaft/.env.example backend/saqaft/.env"
if [ -f "$FE/.env.local" ]; then
  api=$(grep -E '^(DJANGO_API_BASE_URL|NEXT_PUBLIC_API_BASE_URL)=' "$FE/.env.local" | head -2 | tr '\n' ' ')
  [ -n "$api" ] && info "points at: $api" || fail "no DJANGO_API_BASE_URL / NEXT_PUBLIC_API_BASE_URL set in it"
fi
[ -x "$PY" ] && pass "python venv present" || fail "backend/saqaft/.venv MISSING  ->  create it and pip install -r requirements"
echo

echo "2. Backend"
if [ -x "$PY" ]; then
  pending=$(cd "$BE" && "$PY" manage.py showmigrations --plan 2>/dev/null | grep -c '^\[ \]')
  if [ "$pending" = "0" ]; then pass "all migrations applied"
  else fail "$pending migration(s) NOT applied  ->  cd backend/saqaft && .venv/bin/python manage.py migrate"; fi
  counts=$(cd "$BE" && "$PY" manage.py shell -c "
from Programme.models import Programme
from Episode.models import Episode
print('COUNTS', Programme.objects.count(), Programme.objects.filter(is_active=True).count(), Episode.objects.count(), Episode.objects.filter(is_active=True).count())
" 2>/dev/null | grep '^COUNTS')
  if [ -n "$counts" ]; then
    set -- $counts
    info "programmes in database: $2 (active: $3)"
    info "episodes   in database: $4 (active: $5)"
    [ "$3" -gt 0 ] 2>/dev/null && pass "active programmes present" || fail "NO active programmes -> run migrate, or check is_active in /admin/"
    [ "$5" -gt 0 ] 2>/dev/null && pass "active episodes present" || fail "NO active episodes -> run migrate, or check is_active in /admin/"
  else
    fail "could not read the database (is Postgres running, and do the .env DB_ values match?)"
  fi
fi
echo

echo "3. Django HTTP"
base=$(grep -E '^DJANGO_API_BASE_URL=' "$FE/.env.local" 2>/dev/null | cut -d= -f2-)
[ -z "$base" ] && base="http://127.0.0.1:8000/api/"
for ep in programme episode; do
  code=$(curl -s -o /tmp/_sakafat_doc -w '%{http_code}' --max-time 8 "${base%/}/$ep/" 2>/dev/null)
  n=$(grep -o '"slug"' /tmp/_sakafat_doc 2>/dev/null | wc -l | tr -d ' ')
  if [ "$code" = "200" ]; then pass "GET ${base%/}/$ep/ -> 200, $n item(s)"
  elif [ "$code" = "000" ]; then fail "GET ${base%/}/$ep/ -> no response (Django not running?  cd backend/saqaft && .venv/bin/python manage.py runserver)"
  else fail "GET ${base%/}/$ep/ -> HTTP $code"; fi
done
rm -f /tmp/_sakafat_doc
echo

echo "4. Frontend pages"
# Every page lives under /en or /ur, and an address without one is redirected to
# a language. Both are checked: a fault in the shared data layer shows up in each.
where=$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 15 "http://localhost:3000/" 2>/dev/null)
case "$where" in
  */en|*/ur) pass "localhost:3000/ redirects to a language (${where##*/})" ;;
  "")        fail "localhost:3000/ did not redirect to a language (is npm run dev running?)" ;;
  *)         fail "localhost:3000/ redirected to an unexpected address: $where" ;;
esac

for path in /en /en/programs /ur /ur/programs; do
  code=$(curl -s -o /tmp/_sakafat_page -w '%{http_code}' --max-time 15 "http://localhost:3000$path" 2>/dev/null)
  if [ "$code" != "200" ]; then fail "GET localhost:3000$path -> ${code} (is npm run dev running?)"
  else
    # Programme and episode names come from Django in English or Urdu depending on page language.
    hits=$(grep -oE 'Sakafat Signals|Career Rasta|Culture in Motion|Living Heritage|ثقافت سگنلز|کیریئر راستہ|کلچر اِن موشن|زندہ ورثہ' /tmp/_sakafat_page 2>/dev/null | sort -u | wc -l | tr -d ' ')
    [ "$hits" -gt 0 ] && pass "localhost:3000$path renders content ($hits known item(s))" || fail "localhost:3000$path renders NO programme/episode content"
  fi
done
rm -f /tmp/_sakafat_page
echo
echo "=== $ok passed, $bad failed ==="
[ "$bad" -gt 0 ] && echo "Check the FAIL lines above, and look in the 'npm run dev' terminal for [sakafat] warnings."
exit 0
