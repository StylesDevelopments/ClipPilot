#!/usr/bin/env bash
#
# Deploy ClipPilot to Google Cloud Run from the included Dockerfile.
#
# Prerequisites (one-time):
#   - gcloud CLI installed + `gcloud auth login`
#   - a GCP project with billing enabled
#   - the Cloud Run + Cloud Build + Artifact Registry APIs enabled:
#       gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
#   - Supabase env vars stored as secrets (recommended) or passed inline below
#
# Usage:
#   GCP_PROJECT=my-project GCP_REGION=europe-west1 ./scripts/deploy-cloudrun.sh
#
set -euo pipefail

PROJECT="${GCP_PROJECT:?Set GCP_PROJECT}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${SERVICE_NAME:-clippilot}"

echo "Deploying '$SERVICE' to project '$PROJECT' in '$REGION'…"

# NOTE: --no-cpu-throttling keeps the CPU allocated after the HTTP response so
# the background FFmpeg job can finish (Cloud Run otherwise throttles idle CPU).
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --concurrency 2 \
  --max-instances 3 \
  --no-cpu-throttling \
  --set-env-vars "STORAGE_DIR=/tmp/clippilot,MAX_UPLOAD_MB=${MAX_UPLOAD_MB:-200}" \
  --set-secrets "SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"

echo "Done. Service URL:"
gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --format 'value(status.url)'
