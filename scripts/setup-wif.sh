#!/usr/bin/env bash
#
# One-time setup so GitHub Actions can deploy to Cloud Run WITHOUT a key
# (Workload Identity Federation). Safe to re-run. Run in Cloud Shell:
#   bash scripts/setup-wif.sh
#
# At the end it prints the values to paste into your GitHub repo secrets.
set -euo pipefail

PROJECT="$(gcloud config get-value project 2>/dev/null)"
REPO="${GITHUB_REPO:-StylesDevelopments/ClipPilot}"
SA="gh-deployer@${PROJECT}.iam.gserviceaccount.com"

echo "Project: $PROJECT   Repo: $REPO"

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com >/dev/null

# Deploy service account (no key is ever created).
gcloud iam service-accounts create gh-deployer --display-name="GitHub Actions deployer" 2>/dev/null || true

for R in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.admin roles/storage.admin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="$R" --condition=None >/dev/null
done

# Workload Identity pool + provider, locked to this one GitHub repo.
gcloud iam workload-identity-pools create github --location=global --display-name=github 2>/dev/null || true
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github --display-name=github \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" 2>/dev/null || true

POOL="$(gcloud iam workload-identity-pools describe github --location=global --format='value(name)')"
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL}/attribute.repository/${REPO}" >/dev/null

PROVIDER="$(gcloud iam workload-identity-pools providers describe github --location=global --workload-identity-pool=github --format='value(name)')"

echo ""
echo "================= ADD THESE TO GITHUB → Settings → Secrets → Actions ================="
echo "GCP_PROJECT=${PROJECT}"
echo "GCP_SERVICE_ACCOUNT=${SA}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=${PROVIDER}"
echo "(plus SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — and optionally SUPABASE_DB_URL)"
echo "====================================================================================="
