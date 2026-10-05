# GitHub Actions -> AWS without long-lived keys.
#
# One OIDC provider per account, then three roles for Terraform itself:
#   maeven-tf-plan          pull requests / main     read-only, no state writes
#   maeven-tf-apply-staging environment "staging"    maeven-tf-apply policy
#   maeven-tf-apply-prod    environment "production" maeven-tf-apply policy
# The per-environment *site deploy* roles (S3 sync + invalidation) live in
# modules/static-site, not here.
#
# The repo uses OIDC subject customization (include_claim_keys = repo, context,
# job_workflow_ref), so every `sub` below also names the workflow file and ref
# that requested the token. Only terraform.yml on main can assume the apply
# roles; a wrong format fails closed. The repo also uses GitHub's immutable
# subject (repo:<owner>@<id>/<repo>@<id>), so each trust policy lists a value
# for both repo forms. See infra/DESIGN.md section 5.

locals {
  oidc_host = "token.actions.githubusercontent.com"

  # role suffix -> GitHub Environment name used in the OIDC `sub` claim
  apply_environments = {
    staging = "staging"
    prod    = "production"
  }

  state_bucket_arn = aws_s3_bucket.state.arn
  zone_arn         = "arn:aws:route53:::hostedzone/${aws_route53_zone.main.zone_id}"

  # Customized `sub` pieces: repo:<repo>:<context>:job_workflow_ref:<repo>/<file>@<ref>
  # The `repo:` part comes in two forms (plain and immutable); every list below
  # has one value per form. job_workflow_ref always uses the plain name.
  repo_forms  = [var.github_repository, var.github_repository_immutable]
  tf_workflow = "job_workflow_ref:${var.github_repository}/.github/workflows/terraform.yml"

  tf_plan_subs = flatten([
    for r in local.repo_forms : [
      "repo:${r}:pull_request:${local.tf_workflow}@refs/pull/*/merge",
      "repo:${r}:ref:refs/heads/main:${local.tf_workflow}@refs/heads/main",
    ]
  ])

  # role suffix -> allowed `sub` values
  tf_apply_subs = {
    for k, env in local.apply_environments : k => [
      for r in local.repo_forms : "repo:${r}:environment:${env}:${local.tf_workflow}@refs/heads/main"
    ]
  }

  role_arn_prefix = "arn:aws:iam::${local.account_id}:role"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://${local.oidc_host}"
  client_id_list = ["sts.amazonaws.com"]

  # Every role in this account that trusts GitHub depends on it.
  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------------------------------------------------------
# tf-plan: runs terraform.yml on pull requests and on main. May read
# everything except the bootstrap state and the access logs. Plan always runs
# with -lock=false, so it gets no write access to the state bucket at all.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "tf_plan_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.oidc_host}:sub"
      values   = local.tf_plan_subs
    }
  }
}

resource "aws_iam_role" "tf_plan" {
  name               = "${var.project_name}-tf-plan"
  description        = "Terraform plan from terraform.yml (read-only)"
  assume_role_policy = data.aws_iam_policy_document.tf_plan_assume.json
}

resource "aws_iam_role_policy_attachment" "tf_plan_read_only" {
  role       = aws_iam_role.tf_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# ReadOnlyAccess allows s3:GetObject everywhere. Plan output goes to a public
# repo's PR comments, so keep it away from the bootstrap state (it holds the
# zone and OIDC details) and from access logs (they hold visitor IPs).
data "aws_iam_policy_document" "tf_plan_deny" {
  statement {
    sid     = "DenyBootstrapStateAndLogs"
    effect  = "Deny"
    actions = ["s3:GetObject"]
    resources = [
      "${local.state_bucket_arn}/bootstrap/*",
      "arn:aws:s3:::${var.project_name}-*-logs-*/*",
    ]
  }
}

resource "aws_iam_role_policy" "tf_plan_deny" {
  name   = "deny-bootstrap-state-and-logs"
  role   = aws_iam_role.tf_plan.id
  policy = data.aws_iam_policy_document.tf_plan_deny.json
}

# ---------------------------------------------------------------------------
# tf-apply-<env>: runs on push to main, one role per GitHub Environment.
# Both roles share one policy: in a single account CloudFront/WAF cannot be
# fenced per environment by ARN, so the real gate is the required reviewer on
# the "production" GitHub Environment, plus the fact that only terraform.yml on
# main can assume them (see infra/DESIGN.md section 5).
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "tf_apply_assume" {
  for_each = local.apply_environments

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = local.tf_apply_subs[each.key]
    }
  }
}

data "aws_iam_policy_document" "tf_apply" {
  # Site and log buckets of every environment. The state bucket is deliberately
  # not matched by these patterns.
  statement {
    sid = "SiteAndLogBuckets"
    actions = [
      "s3:CreateBucket",
      "s3:Get*",
      "s3:Put*",
      "s3:Delete*",
      "s3:List*",
      "s3:AbortMultipartUpload",
    ]
    resources = [
      "arn:aws:s3:::${var.project_name}-*-site-${local.account_id}",
      "arn:aws:s3:::${var.project_name}-*-site-${local.account_id}/*",
      "arn:aws:s3:::${var.project_name}-*-logs-${local.account_id}",
      "arn:aws:s3:::${var.project_name}-*-logs-${local.account_id}/*",
    ]
  }

  statement {
    sid       = "StateBucketList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [local.state_bucket_arn]
  }

  # bootstrap/* is deliberately absent: CI must not touch the bootstrap state.
  statement {
    sid     = "StateObjects"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "${local.state_bucket_arn}/staging/*",
      "${local.state_bucket_arn}/prod/*",
    ]
  }

  # CloudFront, WAF, ACM and CloudWatch cannot be limited by resource ARN for
  # create/list calls, so these are service-wide.
  statement {
    sid = "EdgeServices"
    actions = [
      "cloudfront:*",
      "wafv2:*",
      "acm:*",
      "cloudwatch:*",
    ]
    resources = ["*"]
  }

  # CloudFront standard logging v2 (delivery source / destination / delivery).
  # The 6.x provider calls Put/Get/Delete DeliverySource and DeliveryDestination,
  # CreateDelivery, GetDelivery, DeleteDelivery, UpdateDeliveryConfiguration and
  # Tag/Untag/ListTagsForResource. The patterns below also cover the
  # Describe{Deliveries,DeliverySources,DeliveryDestinations} list calls.
  statement {
    sid = "LogDelivery"
    actions = [
      "logs:*Delivery*",
      "logs:*LogDelivery*",
      "logs:TagResource",
      "logs:UntagResource",
      "logs:ListTagsForResource",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "AlertTopics"
    actions   = ["sns:*"]
    resources = ["arn:aws:sns:us-east-1:${local.account_id}:${var.project_name}-*"]
  }

  statement {
    sid = "ZoneRecords"
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:ListResourceRecordSets",
      "route53:GetHostedZone",
      "route53:ListTagsForResource",
    ]
    resources = [local.zone_arn]
  }

  statement {
    sid       = "ZoneChangeStatus"
    actions   = ["route53:GetChange"]
    resources = ["arn:aws:route53:::change/*"]
  }

  statement {
    sid       = "ZoneLookup"
    actions   = ["route53:ListHostedZones", "route53:ListHostedZonesByName"]
    resources = ["*"]
  }

  # IAM is limited to the roles this project owns, with an explicit action list
  # (no wildcards, no PassRole, no Attach/DetachRolePolicy: the module only uses
  # inline policies). Two statements, so the boundary condition applies exactly
  # where it matters:
  #
  #  * Every action that creates a role, widens what it may do, or changes who
  #    may assume it requires iam:PermissionsBoundary to be the deploy boundary:
  #    CreateRole, PutRolePermissionsBoundary, PutRolePolicy, UpdateAssumeRolePolicy,
  #    UpdateRole, DeleteRole, DeleteRolePolicy. For CreateRole and
  #    PutRolePermissionsBoundary that is the boundary named in the request; for
  #    the rest it is the boundary already on the target role. So a maeven-* role
  #    without the boundary cannot be created, edited, re-trusted or deleted by CI.
  #  * The remaining actions are read, tag or description changes and cannot
  #    widen permissions or change the trust policy, so they are unconditional.
  statement {
    sid = "ProjectRolesRequireBoundary"
    actions = [
      "iam:CreateRole",
      "iam:PutRolePermissionsBoundary",
      "iam:PutRolePolicy",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateRole",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
    ]
    resources = ["${local.role_arn_prefix}/${var.project_name}-*"]

    condition {
      test     = "ArnEquals"
      variable = "iam:PermissionsBoundary"
      values   = [aws_iam_policy.deploy_boundary.arn]
    }
  }

  statement {
    sid = "ProjectRolesManage"
    actions = [
      "iam:GetRole",
      "iam:UpdateRoleDescription",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:ListRoleTags",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
    ]
    resources = ["${local.role_arn_prefix}/${var.project_name}-*"]
  }

  # An explicit Deny, so no later Allow can ever remove a boundary.
  statement {
    sid       = "ProtectBoundary"
    effect    = "Deny"
    actions   = ["iam:DeleteRolePermissionsBoundary"]
    resources = ["${local.role_arn_prefix}/${var.project_name}-*"]
  }

  # Stops a CI role from touching the roles defined in this bootstrap root
  # (including itself) through the project-wide grants above.
  statement {
    sid    = "ProtectTerraformRoles"
    effect = "Deny"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:UpdateRole",
      "iam:UpdateRoleDescription",
      "iam:UpdateAssumeRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:PassRole",
      "iam:PutRolePermissionsBoundary",
      "iam:DeleteRolePermissionsBoundary",
    ]
    resources = ["${local.role_arn_prefix}/${var.project_name}-tf-*"]
  }

  # The static-site module looks the provider up by URL, which lists them all.
  statement {
    sid       = "OidcProviderList"
    actions   = ["iam:ListOpenIDConnectProviders"]
    resources = ["*"]
  }

  statement {
    sid       = "OidcProviderRead"
    actions   = ["iam:GetOpenIDConnectProvider"]
    resources = ["arn:aws:iam::${local.account_id}:oidc-provider/*"]
  }
}

resource "aws_iam_policy" "tf_apply" {
  name        = "${var.project_name}-tf-apply"
  description = "Permissions Terraform needs to apply the static-site environments"
  policy      = data.aws_iam_policy_document.tf_apply.json
}

resource "aws_iam_role" "tf_apply" {
  for_each = local.apply_environments

  name               = "${var.project_name}-tf-apply-${each.key}"
  description        = "Terraform apply for the ${each.key} environment"
  assume_role_policy = data.aws_iam_policy_document.tf_apply_assume[each.key].json
}

resource "aws_iam_role_policy_attachment" "tf_apply" {
  for_each = local.apply_environments

  role       = aws_iam_role.tf_apply[each.key].name
  policy_arn = aws_iam_policy.tf_apply.arn
}

# ---------------------------------------------------------------------------
# Permissions boundary for every role the CI-applied modules create (the
# per-environment deploy roles). Whatever inline policy such a role ends up
# with, it can never do more than this: sync the site bucket and invalidate
# CloudFront. Resources are patterns because a boundary cannot reference the
# environments' resources, which do not exist yet when it is created.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "deploy_boundary" {
  statement {
    sid     = "SiteBucketObjects"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "arn:aws:s3:::${var.project_name}-*-site-${local.account_id}/*",
    ]
  }

  statement {
    sid       = "SiteBucketList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.project_name}-*-site-${local.account_id}"]
  }

  statement {
    sid       = "Invalidate"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:aws:cloudfront::${local.account_id}:distribution/*"]
  }
}

resource "aws_iam_policy" "deploy_boundary" {
  name        = "${var.project_name}-deploy-boundary"
  description = "Permissions boundary for site deploy roles: S3 sync on site buckets and CloudFront invalidation only"
  policy      = data.aws_iam_policy_document.deploy_boundary.json
}
