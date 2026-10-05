# The role GitHub Actions assumes to upload the build and invalidate the
# cache for this environment: no long-lived keys. The OIDC provider is created
# in bootstrap; it is looked up by URL so no account ID has to be passed in.
#
# Two guards, both from infra/DESIGN.md section 5/6:
#  * the OIDC `sub` (customized: repo, context, job_workflow_ref) names
#    deploy.yml on main, so build steps and other workflows cannot get a token.
#    The repo uses the immutable subject, so both repo forms are trusted.
#  * the role carries the maeven-deploy-boundary permissions boundary, which
#    maeven-tf-apply requires to create or edit it. Its ARN is rebuilt from the
#    account ID here instead of being passed in, to keep IDs out of tfvars.

locals {
  # One `sub` per repo form (plain and immutable); job_workflow_ref always uses
  # the plain repository name.
  deploy_subs = [
    for r in [var.github_repository, var.github_repository_immutable] :
    "repo:${r}:environment:${var.github_environment}:job_workflow_ref:${var.github_repository}/.github/workflows/deploy.yml@refs/heads/main"
  ]

  deploy_boundary_arn = "arn:aws:iam::${local.account_id}:policy/${var.project_name}-deploy-boundary"
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "deploy_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.deploy_subs
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "${local.name_prefix}-deploy"
  description          = "GitHub Actions deploy to ${var.environment}"
  permissions_boundary = local.deploy_boundary_arn
  assume_role_policy   = data.aws_iam_policy_document.deploy_assume.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "ListBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    sid       = "WriteObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    sid       = "Invalidate"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy-site"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
