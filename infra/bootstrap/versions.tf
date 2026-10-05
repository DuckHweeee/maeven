terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Bootstrap state lives in the bucket this root creates. The very first apply
  # ran with local state (the bucket did not exist yet) and was then migrated
  # with `terraform init -migrate-state` (infra/README.md, step 6).
  # The bucket is passed at init:
  #   terraform init -backend-config="bucket=maeven-tfstate-<account_id>"
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "shared"
      ManagedBy   = "terraform"
    }
  }
}
