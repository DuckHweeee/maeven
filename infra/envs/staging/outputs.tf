output "bucket_name" {
  description = "S3 bucket that receives the contents of out/."
  value       = module.site.bucket_name
}

output "cloudfront_distribution_id" {
  description = "Needed for cache invalidation after each deploy."
  value       = module.site.cloudfront_distribution_id
}

output "cloudfront_url" {
  description = "The *.cloudfront.net URL."
  value       = module.site.cloudfront_url
}

output "site_url" {
  description = "Public URL of this environment."
  value       = module.site.site_url
}

output "deploy_role_arn" {
  description = "Value for the AWS_DEPLOY_ROLE_ARN environment variable on GitHub."
  value       = module.site.deploy_role_arn
}

output "logs_bucket_name" {
  description = "Bucket holding CloudFront access logs."
  value       = module.site.logs_bucket_name
}

output "alarm_topic_arn" {
  description = "SNS topic that the alarms publish to."
  value       = module.site.alarm_topic_arn
}

output "web_acl_arn" {
  description = "WAF web ACL ARN, or null when WAF is disabled."
  value       = module.site.web_acl_arn
}
