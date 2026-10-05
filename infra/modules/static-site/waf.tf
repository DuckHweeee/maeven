# WAFv2 web ACL for CloudFront (scope CLOUDFRONT => us-east-1). Off by default.
# With waf_block_mode = false every rule only counts, so a new ACL can be
# watched in CloudWatch / sampled requests before it is allowed to block.

locals {
  # One name for the ACL, its own metric and the alarm dimension in
  # monitoring.tf, so they cannot drift apart.
  waf_name = "${local.name_prefix}-web-acl"

  waf_managed_rule_groups = {
    "AWSManagedRulesAmazonIpReputationList" = 10
    "AWSManagedRulesCommonRuleSet"          = 20
    "AWSManagedRulesKnownBadInputsRuleSet"  = 30
  }
}

resource "aws_wafv2_web_acl" "site" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1

  name        = local.waf_name
  description = "Managed rules and per-IP rate limit for ${local.site_label}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = local.waf_managed_rule_groups

    content {
      name     = rule.key
      priority = rule.value

      # Managed groups carry their own actions, so the mode is chosen by
      # overriding them: count everything, or leave them as shipped.
      override_action {
        dynamic "count" {
          for_each = var.waf_block_mode ? [] : [1]
          content {}
        }

        dynamic "none" {
          for_each = var.waf_block_mode ? [1] : []
          content {}
        }
      }

      statement {
        managed_rule_group_statement {
          name        = rule.key
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-${rule.key}"
        sampled_requests_enabled   = true
      }
    }
  }

  rule {
    name     = "RateLimitPerIp"
    priority = 40

    action {
      dynamic "count" {
        for_each = var.waf_block_mode ? [] : [1]
        content {}
      }

      dynamic "block" {
        for_each = var.waf_block_mode ? [1] : []
        content {}
      }
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-RateLimitPerIp"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = local.waf_name
    sampled_requests_enabled   = true
  }
}
