#!/usr/bin/env bash
#
# Build the backend image, push to ECR, and roll the EC2 container.
# Tweak the CONFIG block below — everything else is mechanical.

set -euo pipefail

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SERVICE_NAME="${SERVICE_NAME:-manzili}"          # ECR repo name + image name
AWS_REGION="${AWS_REGION:-eu-central-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-055271832259}"

# EC2 target. Leave EC2_HOST empty to skip the restart step and only push to ECR.
EC2_HOST="${EC2_HOST:-63.185.144.255}"           # Elastic IP of the manzili EC2
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

# Image tag. Defaults to the short git SHA when available, falling back to "latest".
if [[ -z "${IMAGE_TAG:-}" ]]; then
  if git rev-parse --short HEAD >/dev/null 2>&1; then
    IMAGE_TAG="$(git rev-parse --short HEAD)"
  else
    IMAGE_TAG="latest"
  fi
fi

# EC2 is x86_64 (t3.micro); image must be linux/amd64.
PLATFORM="${PLATFORM:-linux/amd64}"

# ─── DERIVED ─────────────────────────────────────────────────────────────────
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
REPO_URI="${REGISTRY}/${SERVICE_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[deploy] %s\033[0m\n' "$*" >&2; exit 1; }

command -v aws    >/dev/null 2>&1 || die "aws CLI not found in PATH"
command -v docker >/dev/null 2>&1 || die "docker not found in PATH"
command -v ssh    >/dev/null 2>&1 || die "ssh not found in PATH"

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

# ─── 5. Roll the EC2 container ───────────────────────────────────────────────
if [[ -n "${EC2_HOST}" ]]; then
  log "Rolling container on ${EC2_USER}@${EC2_HOST}"
  # The EC2 instance has docker logged into ECR via a 12h token baked in at
  # bootstrap. After 12h it'll have expired, so re-login from the box itself
  # using IMDS-fetched credentials would be cleaner — but for now we just
  # forward a fresh password over ssh and have the box re-login + pull + restart.
  ECR_PW="$(aws ecr get-login-password --region "${AWS_REGION}")"
  ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new "${EC2_USER}@${EC2_HOST}" \
    "echo '${ECR_PW}' | sudo docker login --username AWS --password-stdin '${REGISTRY}' \
       && sudo docker pull '${REPO_URI}:latest' \
       && sudo systemctl restart manzili \
       && echo 'restart ok' \
       && sleep 2 \
       && sudo systemctl is-active manzili"
  log "EC2 rollout complete."
  log "Tail logs with:"
  echo "    ssh ${EC2_USER}@${EC2_HOST} 'sudo docker logs -f manzili'"
else
  log "EC2_HOST not set — skipped restart step."
fi

log "Done. Pushed ${REPO_URI}:${IMAGE_TAG}"
