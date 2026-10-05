# Non-sensitive values only. alert_email comes from TF_VAR_alert_email.
environment        = "staging"
noindex            = true
github_environment = "staging"

# No domain yet: the site is served on the CloudFront *.cloudfront.net domain.
# To switch to a custom domain, add (the Route 53 zone must exist, see bootstrap):
#   domain_name = "staging.maeven.vn"
