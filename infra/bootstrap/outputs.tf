output "state_bucket_name" {
  description = "Pass to every root's init as -backend-config=\"bucket=...\" and set as the TF_STATE_BUCKET repository variable."
  value       = aws_s3_bucket.state.bucket
}

output "hosted_zone_id" {
  description = "Route 53 zone for the apex domain."
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Set these as the domain's nameservers at the registrar."
  value       = aws_route53_zone.main.name_servers
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider (one per account)."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "deploy_boundary_policy_arn" {
  description = "Permissions boundary every maeven-* role created by CI must carry. The static-site module derives the same ARN from the account ID."
  value       = aws_iam_policy.deploy_boundary.arn
}

output "tf_plan_role_arn" {
  description = "Set as the AWS_TF_PLAN_ROLE_ARN repository variable."
  value       = aws_iam_role.tf_plan.arn
}

output "tf_apply_role_arns" {
  description = "Per-environment values for the AWS_TF_APPLY_ROLE_ARN environment variable (keys: staging, prod)."
  value = {
    staging = aws_iam_role.tf_apply["staging"].arn
    prod    = aws_iam_role.tf_apply["prod"].arn
  }
}
