terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State stays local by default. For a team, move it to S3 (create the bucket
  # once by hand, then uncomment and run `terraform init -migrate-state`):
  #
  # backend "s3" {
  #   bucket       = "maeven-terraform-state-<account-id>"
  #   key          = "site/terraform.tfstate"
  #   region       = "ap-southeast-1"
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# CloudFront only accepts ACM certificates issued in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
