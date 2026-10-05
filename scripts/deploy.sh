#!/usr/bin/env bash
# Upload the static export in out/ to S3 and invalidate CloudFront.
#
#   npm run build && ./scripts/deploy.sh
#
# Bucket and distribution come from S3_BUCKET / CLOUDFRONT_DISTRIBUTION_ID,
# or from `terraform output` in infra/envs/${ENV:-prod} when those are unset
# (that root must already be initialised: terraform init -backend-config=...).
#
#   ENV=staging ./scripts/deploy.sh      # outputs from infra/envs/staging
#   WAIT_FOR_INVALIDATION=1 ...          # block until the invalidation completes
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f out/index.html ]]; then
  echo "out/index.html missing — run 'npm run build' first." >&2
  exit 1
fi

TF_DIR="infra/envs/${ENV:-prod}"
S3_BUCKET="${S3_BUCKET:-$(terraform -chdir="${TF_DIR}" output -raw bucket_name)}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-$(terraform -chdir="${TF_DIR}" output -raw cloudfront_distribution_id)}"

echo "→ s3://${S3_BUCKET}  (CloudFront ${CLOUDFRONT_DISTRIBUTION_ID})"

# Symlinks are never followed (--no-follow-symlinks on every sync below); CI
# also refuses to deploy an out/ that contains one.
if [[ -n "$(find out -type l -print -quit)" ]]; then
  echo "out/ contains a symlink; refusing to deploy." >&2
  exit 1
fi

# 1. Hashed JS/CSS chunks: cache forever. Never --delete here, so visitors still
#    holding the previous HTML can load the chunks it points at.
aws s3 sync out/_next/static "s3://${S3_BUCKET}/_next/static" --no-follow-symlinks \
  --cache-control "public, max-age=31536000, immutable"

# 2. Photography: stable names, cache a week.
aws s3 sync out/img "s3://${S3_BUCKET}/img" --delete --no-follow-symlinks \
  --cache-control "public, max-age=604800"

# 3. HTML, RSC .txt payloads and the rest: browsers revalidate every time,
#    CloudFront keeps them until the invalidation below.
aws s3 sync out "s3://${S3_BUCKET}" --delete --no-follow-symlinks \
  --exclude "_next/static/*" --exclude "img/*" \
  --cache-control "public, max-age=0, s-maxage=31536000, must-revalidate"

INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query "Invalidation.Id" --output text)"
echo "${INVALIDATION_ID}"

# CloudFront serves the old HTML until the invalidation completes. CI sets this
# so the smoke test that follows sees the new build, not a stale edge copy.
if [[ "${WAIT_FOR_INVALIDATION:-0}" == "1" ]]; then
  echo "→ waiting for invalidation ${INVALIDATION_ID}"
  aws cloudfront wait invalidation-completed \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --id "${INVALIDATION_ID}"
fi
