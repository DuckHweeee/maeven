# Non-sensitive values only. alert_email comes from TF_VAR_alert_email.
environment        = "prod"
enable_waf         = true
waf_block_mode     = false # flip to true after ~7 days of watching Count metrics
github_environment = "production"

# No domain yet: the site is served on the CloudFront *.cloudfront.net domain.
# To switch to a custom domain, add (the Route 53 zone must exist, see bootstrap):
#   domain_name = "maeven.vn"
#   include_www = true   # also serves www.maeven.vn, 301 to the apex
