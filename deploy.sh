#!/usr/bin/env bash
#
# Build the backend image, push to ECR, and roll out a new ECS deployment.
# Tweak the CONFIG block below — everything else is mechanical.

set -euo pipefail

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SERVICE_NAME="${SERVICE_NAME:-manzili}"          # ECR repo name + image name
AWS_REGION="${AWS_REGION:-eu-central-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-055271832259}"

# ECS rollout target. Leave empty to skip the ECS step and only push to ECR.
ECS_CLUSTER="${ECS_CLUSTER:-}"                   # e.g. "manzili-cluster"
ECS_SERVICE="${ECS_SERVICE:-}"                   # e.g. "manzili-backend"

# Image tag. Defaults to the short git SHA when available, falling back to "latest".
if [[ -z "${IMAGE_TAG:-}" ]]; then
  if git rev-parse --short HEAD >/dev/null 2>&1; then
    IMAGE_TAG="$(git rev-parse --short HEAD)"
  else
    IMAGE_TAG="latest"
  fi
fi

# Force linux/amd64 so the image runs on Fargate even when built on arm64 hosts.
PLATFORM="${PLATFORM:-linux/amd64}"

# ─── DERIVED ─────────────────────────────────────────────────────────────────
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
REPO_URI="${REGISTRY}/${SERVICE_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[deploy] %s\033[0m\n' "$*" >&2; exit 1; }

command -v aws    >/dev/null 2>&1 || die "aws CLI not found in PATH"
command -v docker >/dev/null 2>&1 || die "docker not found in PATH"

# ─── 1. Login to ECR ─────────────────────────────────────────────────────────
log "Authenticating Docker to ${REGISTRY}"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

# ─── 2. Build ────────────────────────────────────────────────────────────────
log "Building ${SERVICE_NAME}:${IMAGE_TAG} for ${PLATFORM}"
docker build \
  --platform "${PLATFORM}" \
  -t "${SERVICE_NAME}:${IMAGE_TAG}" \
  -t "${SERVICE_NAME}:latest" \
  "${SCRIPT_DIR}"

# ─── 3. Tag ──────────────────────────────────────────────────────────────────
log "Tagging image for ${REPO_URI}"
docker tag "${SERVICE_NAME}:${IMAGE_TAG}" "${REPO_URI}:${IMAGE_TAG}"
docker tag "${SERVICE_NAME}:latest"       "${REPO_URI}:latest"

# ─── 4. Push ─────────────────────────────────────────────────────────────────
log "Pushing ${REPO_URI}:${IMAGE_TAG}"
docker push "${REPO_URI}:${IMAGE_TAG}"
log "Pushing ${REPO_URI}:latest"
docker push "${REPO_URI}:latest"

# ─── 5. Force a new ECS deployment (optional) ────────────────────────────────
if [[ -n "${ECS_CLUSTER}" && -n "${ECS_SERVICE}" ]]; then
  log "Triggering ECS rollout: cluster=${ECS_CLUSTER} service=${ECS_SERVICE}"
  aws ecs update-service \
    --region "${AWS_REGION}" \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --force-new-deployment \
    --output json >/dev/null
  log "ECS rollout requested. Track it with:"
  echo "    aws ecs describe-services --region ${AWS_REGION} --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}"
else
  log "ECS_CLUSTER / ECS_SERVICE not set — skipping ECS update."
  log "Set them at the top of this script (or export them) to enable auto-rollout."
fi

log "Done. Pushed ${REPO_URI}:${IMAGE_TAG}"
