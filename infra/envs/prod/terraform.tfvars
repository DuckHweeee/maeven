# Non-sensitive values only. alert_email comes from TF_VAR_alert_email.
environment        = "prod"
domain_name        = "maeven.vn"
include_www        = true
enable_waf         = true
waf_block_mode     = false # flip to true after ~7 days of watching Count metrics
github_environment = "production"
