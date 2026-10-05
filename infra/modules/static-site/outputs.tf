output "bucket_name" {
  description = "S3 bucket that receives the contents of out/."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "Needed for cache invalidation after each deploy."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_url" {
  description = "The *.cloudfront.net URL."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "site_url" {
  description = "Public URL of this environment: https://<domain_name>, or the CloudFront URL when domain_name is empty."
  value       = local.use_custom_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "deploy_role_arn" {
  description = "Role GitHub Actions assumes to sync the build and invalidate the cache."
  value       = aws_iam_role.deploy.arn
}

output "logs_bucket_name" {
  description = "Bucket holding CloudFront access logs."
  value       = aws_s3_bucket.logs.bucket
}

output "alarm_topic_arn" {
  description = "SNS topic (us-east-1) that the alarms publish to."
  value       = aws_sns_topic.alerts.arn
}

output "web_acl_arn" {
  description = "WAF web ACL ARN, or null when WAF is disabled."
  value       = one(aws_wafv2_web_acl.site[*].arn)
}
