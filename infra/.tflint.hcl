# Run from the repo root: tflint --chdir=infra --recursive
# (after a one-time `tflint --init --config=infra/.tflint.hcl` to fetch the plugin)

config {
  call_module_type = "local"
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.49.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
