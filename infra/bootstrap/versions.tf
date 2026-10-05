terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State is local for the very first apply (the bucket that would hold it does
  # not exist yet). Right after that apply, save the bucket name FIRST (once
  # the block below is uncommented, `terraform output` refuses to run until
  # the next init):
  #   STATE_BUCKET=$(terraform output -raw state_bucket_name)
  # then uncomment this block and run
  #   terraform init -migrate-state -backend-config="bucket=$STATE_BUCKET"
  # so bootstrap state lives in the bucket it created. See infra/README.md, step 6.
  #
  # backend "s3" {
  #   key          = "bootstrap/terraform.tfstate"
  #   region       = "ap-southeast-1"
  #   use_lockfile = true
  #   # bucket passed at init:
  #   #   -backend-config="bucket=maeven-tfstate-<account_id>"
  # }
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
