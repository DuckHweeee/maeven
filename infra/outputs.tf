output "bucket_name" {
  description = "S3 bucket that receives the contents of out/."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "Needed for cache invalidation after each deploy."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "site_url" {
  value = local.use_custom_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN repository variable on GitHub."
  value       = local.use_github_oidc ? aws_iam_role.github_deploy[0].arn : null
}
