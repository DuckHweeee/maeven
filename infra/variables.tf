variable "project_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "maeven"
}

variable "aws_region" {
  description = "Region for the S3 bucket. CloudFront itself is global."
  type        = string
  default     = "ap-southeast-1"
}

variable "price_class" {
  description = "CloudFront edge coverage. PriceClass_200 includes Asia (Vietnam, Singapore) without the South America / Oceania surcharge."
  type        = string
  default     = "PriceClass_200"
}

variable "domain_name" {
  description = "Apex domain to serve the site on, e.g. \"maeven.vn\". Leave empty to use the *.cloudfront.net URL only."
  type        = string
  default     = ""
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone that owns domain_name. Defaults to domain_name itself."
  type        = string
  default     = ""
}

variable "include_www" {
  description = "Also serve www.<domain_name>."
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "\"owner/repo\" allowed to deploy via GitHub Actions OIDC. Leave empty to skip creating the deploy role."
  type        = string
  default     = ""
}

variable "github_deploy_branch" {
  description = "Branch whose workflow runs may assume the deploy role."
  type        = string
  default     = "main"
}

variable "create_github_oidc_provider" {
  description = "An AWS account can hold only one GitHub OIDC provider. Set false if it already exists."
  type        = bool
  default     = true
}
