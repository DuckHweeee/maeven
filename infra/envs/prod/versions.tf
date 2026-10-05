terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    key          = "prod/site.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    # bucket passed at init:
    #   -backend-config="bucket=maeven-tfstate-<account_id>"
  }
}
