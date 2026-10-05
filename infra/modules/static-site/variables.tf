variable "project_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "maeven"
}

variable "environment" {
  description = "Environment name; part of every resource name."
  type        = string

  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "environment must be \"staging\" or \"prod\"."
  }
}

variable "domain_name" {
  description = "Primary FQDN of this environment, e.g. \"staging.maeven.vn\" or \"maeven.vn\". Empty (the default) serves the site on the CloudFront *.cloudfront.net domain: no ACM certificate, no Route 53 lookup or records."
  type        = string
  default     = ""

  validation {
    condition     = var.domain_name == "" || can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.domain_name))
    error_message = "domain_name must be empty or a lowercase FQDN such as \"staging.maeven.vn\"."
  }
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone (created in bootstrap) that holds the DNS records. Looked up, not created, and only when domain_name is set."
  type        = string
  default     = "maeven.vn"
}

variable "include_www" {
  description = "Also serve www.<domain_name>, which the viewer-request function 301-redirects to the apex. Ignored when domain_name is empty."
  type        = bool
  default     = false
}

variable "price_class" {
  description = "CloudFront edge coverage. PriceClass_200 includes Asia (Vietnam, Singapore) without the South America / Oceania surcharge."
  type        = string
  default     = "PriceClass_200"
}

variable "noindex" {
  description = "Send X-Robots-Tag: noindex, nofollow. Set for staging so it never shows up in search."
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Attach an AWS WAFv2 web ACL (managed rules + per-IP rate limit)."
  type        = bool
  default     = false
}

variable "waf_block_mode" {
  description = "false: every WAF rule only counts (observe). true: rules block."
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "Requests per 5 minutes per IP before the rate rule triggers."
  type        = number
  default     = 2000

  validation {
    condition     = var.waf_rate_limit >= 10
    error_message = "waf_rate_limit must be at least 10 (the WAFv2 minimum for a rate-based rule)."
  }
}

variable "alert_email" {
  description = "Receives CloudWatch alarm notifications. Never commit it: pass it with TF_VAR_alert_email."
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "Days to keep CloudFront access logs in the logs bucket."
  type        = number
  default     = 90
}

variable "github_repository" {
  description = "\"owner/repo\" allowed to deploy to this environment via GitHub Actions OIDC."
  type        = string
  default     = "DuckHweeee/maeven"
}

variable "github_repository_immutable" {
  description = "Immutable-subject form of github_repository: \"<owner>@<owner_id>/<repo>@<repo_id>\". The deploy role trusts both forms. Public IDs, not secrets."
  type        = string
  default     = "DuckHweeee@97320339/maeven@1364584916"
}

variable "github_environment" {
  description = "GitHub Environment whose jobs may assume the deploy role (OIDC `sub`)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.github_environment)
    error_message = "github_environment must be \"staging\" or \"production\"."
  }
}

# Hooks for a future /api/* backend (the AI stylist). Nothing uses them yet;
# they exist so adding an origin + behavior needs no module refactor.
variable "extra_origins" {
  description = "Additional CloudFront origins (custom origins, e.g. an API). Referenced by ordered_behaviors via origin_id."
  type = list(object({
    origin_id   = string
    domain_name = string
    origin_path = optional(string, "")
    custom_headers = optional(list(object({
      name  = string
      value = string
    })), [])
    custom_origin_config = optional(object({
      http_port              = optional(number, 80)
      https_port             = optional(number, 443)
      origin_protocol_policy = optional(string, "https-only")
      origin_ssl_protocols   = optional(list(string), ["TLSv1.2"])
    }), {})
  }))
  default = []
}

variable "ordered_behaviors" {
  description = "Additional cache behaviors, evaluated in order before the default (S3) behavior. They get the response headers policy but not the clean-URL viewer-request function."
  type = list(object({
    path_pattern             = string
    target_origin_id         = string
    cache_policy_id          = string
    origin_request_policy_id = optional(string)
    allowed_methods          = optional(list(string), ["GET", "HEAD", "OPTIONS"])
    cached_methods           = optional(list(string), ["GET", "HEAD"])
    viewer_protocol_policy   = optional(string, "redirect-to-https")
    compress                 = optional(bool, true)
  }))
  default = []
}
