#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/supabase/.env.production"
PROJECT_REF="${1:-}"
ENV_FILE="${2:-$DEFAULT_ENV_FILE}"
DEPLOY_DEV_LOGIN="${DEPLOY_DEV_LOGIN:-false}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") <project-ref> [env-file]

Examples:
  $(basename "$0") abcdefghijklmnopqrst
  $(basename "$0") abcdefghijklmnopqrst $ROOT_DIR/supabase/.env.production

Notes:
  - Run 'supabase login' first.
  - Copy $ROOT_DIR/supabase/.env.production.example to .env.production and fill real values.
  - Set DEPLOY_DEV_LOGIN=true only for staging or temporary debugging.
EOF
}

if [[ -z "$PROJECT_REF" ]]; then
  usage
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI is not installed."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  echo "Copy $ROOT_DIR/supabase/.env.production.example to create it first."
  exit 1
fi

if grep -Eq 'your-project-ref|your-supabase-service-role-key|your-miniprogram-app-secret|your-open-platform-app-secret|wx_your_|your-aliyun-access-key-id|your-aliyun-access-key-secret|your-approved-sign-name|SMS_123456789|replace-with-a-long-random-secret' "$ENV_FILE"; then
  echo "Error: placeholder values still exist in $ENV_FILE"
  exit 1
fi

echo "==> Linking Supabase project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo "==> Uploading Edge Function secrets from $ENV_FILE"
supabase secrets set --env-file "$ENV_FILE"

echo "==> Applying database migrations"
supabase db push

FUNCTIONS=(
  auth-wechat-login
  auth-phone-send-code
  auth-phone-login
  auth-link-phone
  auth-link-wechat
  auth-refresh
  sync-push
  sync-pull
  media-upload-ticket
  media-download-ticket
)

if [[ "$DEPLOY_DEV_LOGIN" == "true" ]]; then
  FUNCTIONS+=(auth-dev-login)
fi

echo "==> Deploying Edge Functions"
for fn in "${FUNCTIONS[@]}"; do
  echo "   -> $fn"
  supabase functions deploy "$fn" --no-verify-jwt
done

cat <<EOF
==> Production deploy complete.

Next checks:
  1. Confirm 'entry-photos' exists as a private bucket in Supabase Storage.
  2. Confirm Edge Function secrets are present in the Supabase dashboard.
  3. Point mini program and Flutter to:
     https://$PROJECT_REF.supabase.co/functions/v1
  4. Keep FARMERNOTE_ENABLE_DEV_LOGIN=false in production.
EOF
