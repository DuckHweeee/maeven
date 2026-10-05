variable "project_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "maeven"
}

variable "aws_region" {
  description = "Region for the S3 buckets. CloudFront, ACM, WAF and alarms are always us-east-1."
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name: staging or prod."
  type        = string
}

variable "domain_name" {
  description = "Primary FQDN of this environment. Empty: serve on the CloudFront *.cloudfront.net domain (no ACM, no Route 53)."
  type        = string
  default     = ""
}

variable "include_www" {
  description = "Also serve www.<domain_name> (301 to the apex)."
  type        = bool
  default     = false
}

variable "noindex" {
  description = "Send X-Robots-Tag: noindex, nofollow."
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Attach the WAFv2 web ACL."
  type        = bool
  default     = false
}

variable "waf_block_mode" {
  description = "false: WAF rules only count. true: they block."
  type        = bool
  default     = false
}

variable "github_environment" {
  description = "GitHub Environment allowed to assume the deploy role."
  type        = string
}

variable "alert_email" {
  description = "Alarm notification address. Never commit it: set TF_VAR_alert_email."
  type        = string
  sensitive   = true
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront only accepts ACM certificates and WAF web ACLs from us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "site" {
  source = "../../modules/static-site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  project_name       = var.project_name
  environment        = var.environment
  domain_name        = var.domain_name
  include_www        = var.include_www
  noindex            = var.noindex
  enable_waf         = var.enable_waf
  waf_block_mode     = var.waf_block_mode
  github_environment = var.github_environment
  alert_email        = var.alert_email
}
