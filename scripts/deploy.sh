#!/usr/bin/env bash
# Upload the static export in out/ to S3 and invalidate CloudFront.
#
#   npm run build && ./scripts/deploy.sh
#
# Bucket and distribution come from S3_BUCKET / CLOUDFRONT_DISTRIBUTION_ID,
# or from `terraform output` in infra/ when those are unset.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f out/index.html ]]; then
  echo "out/index.html missing — run 'npm run build' first." >&2
  exit 1
fi

S3_BUCKET="${S3_BUCKET:-$(terraform -chdir=infra output -raw bucket_name)}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-$(terraform -chdir=infra output -raw cloudfront_distribution_id)}"

echo "→ s3://${S3_BUCKET}  (CloudFront ${CLOUDFRONT_DISTRIBUTION_ID})"

# 1. Hashed JS/CSS chunks: cache forever. Never --delete here, so visitors still
#    holding the previous HTML can load the chunks it points at.
aws s3 sync out/_next/static "s3://${S3_BUCKET}/_next/static" \
  --cache-control "public, max-age=31536000, immutable"

# 2. Photography: stable names, cache a week.
aws s3 sync out/img "s3://${S3_BUCKET}/img" --delete \
  --cache-control "public, max-age=604800"

# 3. HTML, RSC .txt payloads and the rest: browsers revalidate every time,
#    CloudFront keeps them until the invalidation below.
aws s3 sync out "s3://${S3_BUCKET}" --delete \
  --exclude "_next/static/*" --exclude "img/*" \
  --cache-control "public, max-age=0, s-maxage=31536000, must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query "Invalidation.Id" --output text
