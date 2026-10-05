# Our own response headers policy instead of Managed-SecurityHeadersPolicy, so
# we control the CSP, Permissions-Policy and (for staging) X-Robots-Tag.

locals {
  # Report-Only: violations are reported by browsers but nothing is blocked
  # yet. Tighten and move to an enforcing header once the site is known clean.
  csp_report_only = join("; ", [
    "default-src 'self'",
    "img-src 'self' data:",
    "media-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ])

  custom_headers = concat(
    [
      {
        header = "Permissions-Policy"
        value  = "camera=(), microphone=(), geolocation=()"
      },
      {
        header = "Content-Security-Policy-Report-Only"
        value  = local.csp_report_only
      },
    ],
    var.noindex ? [
      {
        header = "X-Robots-Tag"
        value  = "noindex, nofollow"
      },
    ] : [],
  )
}

resource "aws_cloudfront_response_headers_policy" "site" {
  name    = "${local.name_prefix}-security-headers"
  comment = "Security headers for ${var.domain_name}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    dynamic "items" {
      for_each = local.custom_headers

      content {
        header   = items.value.header
        value    = items.value.value
        override = true
      }
    }
  }
}
