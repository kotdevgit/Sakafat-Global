#!/usr/bin/env bash
# Remote script executed on cPanel server via SSH stdin.
set -euo pipefail

mode=${1:?}; app_root=${2:?}; node_bin=${3:?}; python_bin=${4:?}; release_id=${5:?}; health_url=${6:?}

fail() { printf '%s\n' "$*" >&2; exit 1; }

[[ "$mode" == "preflight" || "$mode" == "deploy" ]] || fail "Invalid operation"
[[ -d "$app_root" ]] || fail "Application root does not exist: $app_root"
[[ -d "$app_root/shared" ]] || fail "Shared directory missing: $app_root/shared"
[[ -r "$app_root/shared/frontend.env" ]] || fail "Missing $app_root/shared/frontend.env"
[[ -r "$app_root/shared/backend.env" ]] || fail "Missing $app_root/shared/backend.env"

# Verify toolchains
export PATH="$node_bin:$python_bin:$PATH"
command -v node >/dev/null || fail "Node binary not found in $node_bin"
command -v python >/dev/null || command -v python3 >/dev/null || fail "Python binary not found in $python_bin"

for program in unzip curl mv ln mkdir cp chmod rm readlink touch sleep; do
  command -v "$program" >/dev/null || fail "Required command unavailable: $program"
done

if [[ "$mode" == "preflight" ]]; then
  echo "cPanel deployment preflight checks passed successfully!"
  exit 0
fi

# Deployment execution
archive="$app_root/incoming-$release_id.zip"
release="$app_root/releases/$release_id"
[[ -f "$archive" ]] || fail "Deployment archive missing: $archive"
[[ ! -e "$release" ]] || fail "Release already exists: $release"

previous=''
switched=false
if [[ -L "$app_root/current" ]]; then
  previous=$(readlink "$app_root/current")
fi

finish() {
  code=$?
  trap - EXIT
  if [[ "$code" != 0 && "$switched" == true ]]; then
    if [[ -n "$previous" ]]; then
      echo "Deployment failed. Rolling back to $previous..." >&2
      ln -s "$previous" "$app_root/.rollback-$release_id"
      mv -Tf "$app_root/.rollback-$release_id" "$app_root/current"
    fi
    touch "$app_root/tmp/restart.txt"
  fi
  exit "$code"
}
trap finish EXIT

echo "Extracting release $release_id..."
mkdir -p "$release" "$app_root/tmp" "$app_root/shared/media"
unzip -q "$archive" -d "$release"
app="$release/sakafat-app"

# 1. Link shared environments and persistent media
ln -s "$app_root/shared/frontend.env" "$app/frontend/.env.production"
ln -s "$app_root/shared/frontend.env" "$app/frontend/.env.local"
ln -s "$app_root/shared/backend.env" "$app/backend/saqaft/.env"
rm -rf "$app/backend/saqaft/media"
ln -s "$app_root/shared/media" "$app/backend/saqaft/media"

# 2. Build Frontend
echo "Building Next.js frontend..."
cd "$app/frontend"
export RELEASE_ID="$release_id"
npm ci
npm run build

# 3. Setup Backend (Django)
echo "Running Django migrations and static collection..."
cd "$app/backend/saqaft"
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# 4. Atomic release switch
echo "Switching active release symlink..."
ln -s "releases/$release_id/sakafat-app" "$app_root/.next-$release_id"
mv -Tf "$app_root/.next-$release_id" "$app_root/current"
switched=true

# 5. Restart Passenger
echo "Restarting Phusion Passenger application..."
touch "$app_root/tmp/restart.txt"
mkdir -p "$app/frontend/tmp" "$app/backend/saqaft/tmp"
touch "$app/frontend/tmp/restart.txt" "$app/backend/saqaft/tmp/restart.txt"

# 6. Verify health endpoint
echo "Verifying health endpoint: $health_url..."
verified=false
for attempt in {1..12}; do
  if curl --fail --silent --show-error --max-time 10 "$health_url" > "$release/health.json"; then
    if grep -q '"status":"ok"' "$release/health.json"; then
      verified=true
      break
    fi
  fi
  echo "Waiting for application to boot (attempt $attempt/12)..."
  sleep 5
done

if [[ "$verified" != true ]]; then
  fail "Health verification failed at $health_url. Triggering automatic rollback."
fi

rm -f "$archive" "$release/health.json"
echo "Release $release_id is now live and healthy!"
