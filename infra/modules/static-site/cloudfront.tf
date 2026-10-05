resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name_prefix}-site"
  description                       = "CloudFront -> ${local.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# www -> apex redirect plus clean-URL rewrite, see functions/viewer_request.js.
resource "aws_cloudfront_function" "viewer_request" {
  name    = "${local.name_prefix}-viewer-request"
  runtime = "cloudfront-js-2.0"
  comment = "www to apex 301; map clean URLs onto the .html files from next build"
  publish = true
  code    = file("${path.module}/functions/viewer_request.js")
}

# AWS-managed policy: cache by path only (no cookies / query strings / headers),
# gzip + brotli. Response headers come from our own policy in headers.tf.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  comment             = "${local.name_prefix} static site"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = local.aliases
  web_acl_id          = one(aws_wafv2_web_acl.site[*].arn)

  origin {
    origin_id                = "s3-site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  dynamic "origin" {
    for_each = var.extra_origins

    content {
      origin_id   = origin.value.origin_id
      domain_name = origin.value.domain_name
      origin_path = origin.value.origin_path

      custom_origin_config {
        http_port              = origin.value.custom_origin_config.http_port
        https_port             = origin.value.custom_origin_config.https_port
        origin_protocol_policy = origin.value.custom_origin_config.origin_protocol_policy
        origin_ssl_protocols   = origin.value.custom_origin_config.origin_ssl_protocols
      }

      dynamic "custom_header" {
        for_each = origin.value.custom_headers

        content {
          name  = custom_header.value.name
          value = custom_header.value.value
        }
      }
    }
  }

  default_cache_behavior {
    target_origin_id           = "s3-site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_request.arn
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.ordered_behaviors

    content {
      path_pattern               = ordered_cache_behavior.value.path_pattern
      target_origin_id           = ordered_cache_behavior.value.target_origin_id
      viewer_protocol_policy     = ordered_cache_behavior.value.viewer_protocol_policy
      allowed_methods            = ordered_cache_behavior.value.allowed_methods
      cached_methods             = ordered_cache_behavior.value.cached_methods
      compress                   = ordered_cache_behavior.value.compress
      cache_policy_id            = ordered_cache_behavior.value.cache_policy_id
      origin_request_policy_id   = ordered_cache_behavior.value.origin_request_policy_id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
    }
  }

  # The bucket policy grants s3:ListBucket, so S3 answers a missing key with a
  # real 404 (not 403) and only 404 needs mapping to the Next.js 404 page.
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
