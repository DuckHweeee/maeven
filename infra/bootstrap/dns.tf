# The public hosted zone for the apex domain lives here, not in an environment,
# so staging and prod can both add records to it and neither can delete it.
# After the first apply, point the registrar's nameservers at the
# `name_servers` output (see infra/README.md).

resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "${var.project_name} public zone"

  lifecycle {
    prevent_destroy = true
  }
}
