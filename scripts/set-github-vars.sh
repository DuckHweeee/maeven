#!/usr/bin/env bash
# Set the GitHub variables one environment needs, straight from Terraform outputs.
#
#   ./scripts/set-github-vars.sh staging
#   ./scripts/set-github-vars.sh prod
#   DRY_RUN=1 ./scripts/set-github-vars.sh staging    # print, change nothing
#
# Run it after `terraform apply` of that environment (infra/README.md, steps 9-10).
# It runs under bash whatever your login shell is, and it refuses to write a value
# that does not look right, so a pasted "%" or a URL in the wrong variable cannot
# get through.
set -euo pipefail

cd "$(dirname "$0")/.."

case "${1:-}" in
  staging) tf_dir=infra/envs/staging gh_env=staging    site_repo_var=SITE_URL_STAGING ;;
  prod)    tf_dir=infra/envs/prod    gh_env=production site_repo_var=SITE_URL_PROD ;;
  *)
    echo "usage: $0 staging|prod" >&2
    exit 2
    ;;
esac

tf_out() { terraform -chdir="$tf_dir" output -raw "$1"; }

apply_role="$(terraform -chdir=infra/bootstrap output -json tf_apply_role_arns |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "${1}")"
deploy_role="$(tf_out deploy_role_arn)"
bucket="$(tf_out bucket_name)"
dist_id="$(tf_out cloudfront_distribution_id)"
site_url="$(tf_out site_url)"

# Refuse anything that is not exactly the shape GitHub Actions expects.
check() { # name value regex
  if [[ ! "$2" =~ $3 ]]; then
    echo "refusing to set $1: unexpected value (does not match $3)" >&2
    exit 1
  fi
}
check AWS_TF_APPLY_ROLE_ARN      "$apply_role"  '^arn:aws:iam::[0-9]{12}:role/[A-Za-z0-9+=,.@_-]+$'
check AWS_DEPLOY_ROLE_ARN        "$deploy_role" '^arn:aws:iam::[0-9]{12}:role/[A-Za-z0-9+=,.@_-]+$'
check S3_BUCKET                  "$bucket"      '^maeven-[a-z0-9-]+$'
check CLOUDFRONT_DISTRIBUTION_ID "$dist_id"     '^E[A-Z0-9]+$'
check SITE_URL                   "$site_url"    '^https://[A-Za-z0-9.-]+$'

set_var() { # name value [--env env]
  local name="$1" value="$2"
  shift 2
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "would set $name ${*:-(repo)}"
  else
    gh variable set "$name" --body "$value" "$@"
    echo "set $name ${*:-(repo)}"
  fi
}

set_var AWS_TF_APPLY_ROLE_ARN      "$apply_role"  --env "$gh_env"
set_var AWS_DEPLOY_ROLE_ARN        "$deploy_role" --env "$gh_env"
set_var S3_BUCKET                  "$bucket"      --env "$gh_env"
set_var CLOUDFRONT_DISTRIBUTION_ID "$dist_id"     --env "$gh_env"
set_var SITE_URL                   "$site_url"    --env "$gh_env"
set_var "$site_repo_var"           "$site_url"
