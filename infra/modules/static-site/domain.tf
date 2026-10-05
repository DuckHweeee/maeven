# Custom domain for this environment. The hosted zone is created in bootstrap
# and only looked up here.

locals {
  aliases = concat(
    [var.domain_name],
    var.include_www ? ["www.${var.domain_name}"] : []
  )
}

data "aws_route53_zone" "site" {
  name         = var.hosted_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = slice(local.aliases, 1, length(local.aliases))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  cert_dvo = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => dvo
  }
}

# Keyed by the static alias list so the plan never depends on apply-time values.
resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.aliases)

  zone_id         = data.aws_route53_zone.site.zone_id
  name            = local.cert_dvo[each.key].resource_record_name
  type            = local.cert_dvo[each.key].resource_record_type
  records         = [local.cert_dvo[each.key].resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct(local.aliases, ["A", "AAAA"]) : "${pair[0]}-${pair[1]}" => {
      name = pair[0]
      type = pair[1]
    }
  }

  zone_id = data.aws_route53_zone.site.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
