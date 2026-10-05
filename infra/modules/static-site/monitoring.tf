# Alarms for the CloudFront distribution (and WAF, when on). CloudFront and WAF
# publish their metrics to us-east-1 only, so the alarms and the SNS topic they
# notify live there too.

resource "aws_sns_topic" "alerts" {
  provider = aws.us_east_1

  name = "${local.name_prefix}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  provider = aws.us_east_1

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx" {
  provider = aws.us_east_1

  alarm_name          = "${local.name_prefix}-cloudfront-5xx"
  alarm_description   = "More than 1% of viewer requests ended in a 5xx for two consecutive 5-minute periods."
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.site.id
    Region         = "Global"
  }
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_4xx" {
  provider = aws.us_east_1

  alarm_name          = "${local.name_prefix}-cloudfront-4xx"
  alarm_description   = "More than 15% of viewer requests ended in a 4xx for three consecutive 5-minute periods."
  namespace           = "AWS/CloudFront"
  metric_name         = "4xxErrorRate"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 15
  period              = 300
  evaluation_periods  = 3
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.site.id
    Region         = "Global"
  }
}

# Only meaningful once waf_block_mode = true: in Count mode nothing is blocked.
resource "aws_cloudwatch_metric_alarm" "waf_blocked" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1

  alarm_name          = "${local.name_prefix}-waf-blocked"
  alarm_description   = "WAF blocked more than 500 requests in 5 minutes."
  namespace           = "AWS/WAFV2"
  metric_name         = "BlockedRequests"
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 500
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    WebACL = local.waf_name
    Rule   = "ALL"
    Region = "Global"
  }
}
