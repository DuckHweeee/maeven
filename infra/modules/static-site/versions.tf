terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"

      # CloudFront only accepts ACM certificates and WAF web ACLs from
      # us-east-1; its alarms, log delivery source and the SNS topic that the
      # alarms publish to live there too. The caller passes both providers.
      configuration_aliases = [aws.us_east_1]
    }
  }
}
