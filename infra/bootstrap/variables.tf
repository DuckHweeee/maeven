variable "project_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "maeven"
}

variable "aws_region" {
  description = "Region for the state bucket and IAM/Route 53/Budgets calls."
  type        = string
  default     = "ap-southeast-1"
}

variable "domain_name" {
  description = "Apex domain whose Route 53 public hosted zone is created here."
  type        = string
  default     = "maeven.vn"
}

variable "github_repository" {
  description = "\"owner/repo\" whose GitHub Actions runs may assume the Terraform roles."
  type        = string
  default     = "DuckHweeee/maeven"
}

variable "github_repository_immutable" {
  description = "Immutable-subject form of github_repository: \"<owner>@<owner_id>/<repo>@<repo_id>\". Public IDs, not secrets. Read it from GET /repos/<repo>/actions/oidc/customization/sub (sub_claim_prefix)."
  type        = string
  default     = "DuckHweeee@97320339/maeven@1364584916"
}

variable "alert_email" {
  description = "Receives AWS Budget alerts. Never commit it: set TF_VAR_alert_email or an untracked bootstrap/terraform.tfvars."
  type        = string
  sensitive   = true
}

variable "monthly_budget_usd" {
  description = "Monthly cost budget for the whole account, in USD."
  type        = number
  default     = 25
}
