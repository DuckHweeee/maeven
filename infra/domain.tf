# Optional custom domain. Active only when var.domain_name is set, and expects
# the domain's DNS to be a Route 53 public hosted zone in this account.

locals {
  use_custom_domain = var.domain_name != ""
  aliases = local.use_custom_domain ? concat(
    [var.domain_name],
    var.include_www ? ["www.${var.domain_name}"] : []
  ) : []
}

data "aws_route53_zone" "site" {
  count = local.use_custom_domain ? 1 : 0

  name         = var.hosted_zone_name != "" ? var.hosted_zone_name : var.domain_name
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  count    = local.use_custom_domain ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = slice(local.aliases, 1, length(local.aliases))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  cert_dvo = local.use_custom_domain ? {
    for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => dvo
  } : {}
}

# Keyed by the static alias list so the plan never depends on apply-time values.
resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.aliases)

  zone_id         = data.aws_route53_zone.site[0].zone_id
  name            = local.cert_dvo[each.key].resource_record_name
  type            = local.cert_dvo[each.key].resource_record_type
  records         = [local.cert_dvo[each.key].resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count    = local.use_custom_domain ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "site" {
  for_each = local.use_custom_domain ? {
    for pair in setproduct(local.aliases, ["A", "AAAA"]) : "${pair[0]}-${pair[1]}" => {
      name = pair[0]
      type = pair[1]
    }
  } : {}

  zone_id = data.aws_route53_zone.site[0].zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
