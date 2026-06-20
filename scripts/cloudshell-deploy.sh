#!/usr/bin/env bash
#
# One-shot Cloud Shell deploy for ClipPilot.
# Reads secrets from ./deploy.env (so you paste them in the editor, not the
# fiddly mobile terminal), runs DB migrations, then deploys to Cloud Run.
#
# Usage:
#   cloudshell edit deploy.env      # paste your values in the editor, save
#   bash scripts/cloudshell-deploy.sh
#
set -euo pipefail

if [ -f deploy.env ]; then
  set -a; . ./deploy.env; set +a
fi

: "${SUPABASE_URL:?Add SUPABASE_URL to deploy.env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Add SUPABASE_SERVICE_ROLE_KEY to deploy.env}"
REGION="${REGION:-europe-west1}"

echo "→ Enabling APIs…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  echo "→ Applying database migrations…"
  command -v psql >/dev/null 2>&1 || sudo apt-get update && sudo apt-get install -y --no-install-recommends postgresql-client
  for f in supabase/migrations/*.sql; do
    echo "   $f"
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  done
else
  echo "→ Skipping migrations (no SUPABASE_DB_URL set)."
fi

echo "→ Deploying to Cloud Run (first build takes a few minutes)…"
gcloud run deploy clippilot \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 2Gi --cpu 2 --timeout 600 --concurrency 2 --max-instances 3 \
  --no-cpu-throttling \
  --set-env-vars "STORAGE_DIR=/tmp/clippilot,SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"

echo ""
echo "✅ Done. Your live URL:"
gcloud run services describe clippilot --region "$REGION" --format 'value(status.url)'
