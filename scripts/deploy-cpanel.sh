#!/usr/bin/env bash
# GitHub Actions entry point for cPanel deployment over SSH.
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PORT:=22}"
: "${DEPLOY_APP_ROOT:?DEPLOY_APP_ROOT is required (e.g. /home/username/sakafat-app)}"
: "${DEPLOY_NODE_BIN:=/opt/cpanel/ea-nodejs22/bin}"
: "${DEPLOY_PYTHON_BIN:=/home/$DEPLOY_USER/virtualenv/sakafat-backend/3.12/bin}"
: "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY secret is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${DEPLOY_HEALTH_URL:?DEPLOY_HEALTH_URL is required (e.g. https://yourdomain.com/api/health/)}"

secret_dir=$(mktemp -d)
trap 'rm -rf -- "$secret_dir"' EXIT
chmod 700 "$secret_dir"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$secret_dir/key"
chmod 600 "$secret_dir/key"
unset DEPLOY_SSH_KEY

ssh_opts=(
  -i "$secret_dir/key"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o StrictHostKeyChecking=no
  -o ConnectTimeout=20
)

remote="$DEPLOY_USER@$DEPLOY_HOST"

echo "=== 1. Running deployment preflight on $DEPLOY_HOST ==="
ssh "${ssh_opts[@]}" -p "$DEPLOY_PORT" "$remote" \
  "bash -s -- preflight '$DEPLOY_APP_ROOT' '$DEPLOY_NODE_BIN' '$DEPLOY_PYTHON_BIN' '$RELEASE_ID' '$DEPLOY_HEALTH_URL'" \
  < scripts/deploy-cpanel-remote.sh

echo "=== 2. Uploading deployment package ==="
scp "${ssh_opts[@]}" -P "$DEPLOY_PORT" sakafat-cpanel-bundle.zip "$remote:$DEPLOY_APP_ROOT/incoming-$RELEASE_ID.zip"

echo "=== 3. Executing deployment & restart ==="
ssh "${ssh_opts[@]}" -p "$DEPLOY_PORT" "$remote" \
  "bash -s -- deploy '$DEPLOY_APP_ROOT' '$DEPLOY_NODE_BIN' '$DEPLOY_PYTHON_BIN' '$RELEASE_ID' '$DEPLOY_HEALTH_URL'" \
  < scripts/deploy-cpanel-remote.sh

echo "=== Deployment completed successfully! ==="
