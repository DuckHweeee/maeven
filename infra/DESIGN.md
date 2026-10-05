# Thiết kế hạ tầng MAEVEN — staging + prod

> Đây là **nguồn sự thật** cho mọi thay đổi trong `infra/`, `.github/workflows/`
> và `scripts/deploy.sh`, `scripts/smoke.sh`. Agent thực thi (terraform-engineer,
> cicd-engineer) làm **đúng** theo file này; muốn lệch thì báo về lead (Opus +
> chủ repo) để sửa file này trước, không tự quyết.
>
> Các mục đánh dấu 🔒 là **hợp đồng giao tiếp** — tên biến, output, tên resource,
> tên biến GitHub. Hai nhánh việc (Terraform và CI/CD) chạy song song dựa trên
> chúng, nên không được đổi tên khi chưa cập nhật file này.

## 1. Bối cảnh và quyết định

- Site là **static export thuần** (`output: "export"`), không cần server Node.
  Phục vụ từ S3 private sau CloudFront (OAC).
- **Một AWS account** (`aws sts get-caller-identity`; repo public nên không ghi
  account ID vào file nào được commit), hai môi trường **staging** và **prod**,
  mỗi môi trường một state riêng.
- DNS của `maeven.vn` chuyển về **Route 53** (hosted zone tạo ở bootstrap).
- **Ngoài phạm vi:** backend `/api/*` cho AI stylist. Module chỉ chừa chỗ
  (`extra_origins`, `ordered_behaviors`) để gắn vào sau mà không phải refactor.
- **Chỉ người** chạy `terraform apply` lần đầu và bootstrap. Sau đó apply chạy
  trong CI, prod cần duyệt. Agent không bao giờ apply.

## 2. Kiến trúc

```
                ┌──────────────── us-east-1 ────────────────┐
Browser ─HTTPS─▶ CloudFront (mỗi env một distribution)       │
                │  ├ WAFv2 web ACL (chỉ prod)                │
                │  ├ CloudFront Function viewer-request:     │
                │  │    www.* → 301 apex; /x → /x.html       │
                │  ├ Response headers policy riêng           │
                │  ├ ACM cert                                │
                │  ├ Alarm 5xx/4xx (+WAF) → SNS email        │
                │  └ Standard logging v2 → S3 logs (90 ngày) │
                └──────────────────┬─────────────────────────┘
                                   │ OAC (sigv4)
                  S3 site bucket (ap-southeast-1, private, versioning)

Bootstrap (dùng chung): bucket tfstate · Route 53 zone maeven.vn ·
GitHub OIDC provider · role tf-plan / tf-apply-staging / tf-apply-prod · AWS Budget
```

|                | staging                         | prod                                   |
|----------------|---------------------------------|----------------------------------------|
| Domain         | `staging.maeven.vn`             | `maeven.vn` + `www.maeven.vn` (301 → apex) |
| WAF            | tắt                             | bật, ban đầu **Count**, sau 7 ngày chuyển **Block** |
| Index          | `X-Robots-Tag: noindex, nofollow` | bình thường                          |
| Apply / deploy | tự động khi merge `main`        | sau khi duyệt ở GitHub Environment `production` |

## 3. Cấu trúc thư mục

```
infra/
  DESIGN.md  README.md
  .tflint.hcl                 # plugin aws + rule terraform recommended
  bootstrap/                  # apply 1 lần, bằng tay, quyền admin
    versions.tf  variables.tf  outputs.tf
    state.tf  dns.tf  github_oidc.tf  budget.tf
  modules/static-site/
    versions.tf  variables.tf  outputs.tf
    s3.tf  cloudfront.tf  headers.tf  waf.tf  logging.tf  monitoring.tf
    domain.tf  deploy_role.tf
    functions/viewer_request.js
  envs/staging/  envs/prod/
    versions.tf  main.tf  outputs.tf  terraform.tfvars  .terraform.lock.hcl
```

Các file cũ ở gốc `infra/` (`main.tf`, `domain.tf`, `github_oidc.tf`,
`variables.tf`, `outputs.tf`, `versions.tf`, `terraform.tfvars.example`,
`functions/rewrite.js`) bị **xoá**. Logic được chuyển vào module. Chưa từng
apply (đã kiểm tra 2026-10-05: account không có bucket `maeven-*`, máy không có
tfstate), nên không cần `moved {}` hay `import {}`.

## 4. Quy ước chung

- Terraform `>= 1.10` (đang dùng 1.16.x), provider `hashicorp/aws ~> 6.0`.
- Region chính `ap-southeast-1`. Mọi thứ gắn với CloudFront (ACM, WAF, log
  delivery source, alarm CloudFront, SNS cho alarm) dùng provider alias
  `aws.us_east_1`.
- `default_tags`: `Project = "maeven"`, `Environment = <env>`, `ManagedBy = "terraform"`.
- 🔒 Tên resource: `${project_name}-${environment}-<vai trò>`. Bucket thêm hậu
  tố account ID:
  - site: `maeven-<env>-site-<account_id>`
  - logs: `maeven-<env>-logs-<account_id>`
  - state: `maeven-tfstate-<account_id>`
- Không commit secret. **Email nhận cảnh báo không commit**, truyền qua
  `TF_VAR_alert_email` (local: `infra/bootstrap/terraform.tfvars` hoặc biến môi
  trường; CI: biến repo `ALERT_EMAIL`). `.gitignore` phải chặn
  `infra/bootstrap/terraform.tfvars`.
- `envs/*/terraform.tfvars` **được commit**: chỉ chứa giá trị không nhạy cảm.
- `.terraform.lock.hcl` của mỗi root được commit, lock cho
  `darwin_arm64` + `linux_amd64`.

## 5. Bootstrap (`infra/bootstrap/`)

State ban đầu local. Sau khi apply, bật `backend "s3"` với
`key = "bootstrap/terraform.tfstate"` rồi chạy `init -migrate-state`.

| File | Nội dung |
|---|---|
| `state.tf` | Bucket `maeven-tfstate-<account_id>`: versioning, SSE-S3, block public access, `BucketOwnerEnforced`, policy chặn non-TLS (`aws:SecureTransport = false`), lifecycle giữ noncurrent 90 ngày, `prevent_destroy`. |
| `dns.tf` | `aws_route53_zone` cho `var.domain_name` (`maeven.vn`), `prevent_destroy`. |
| `github_oidc.tf` | OIDC provider `token.actions.githubusercontent.com` (aud `sts.amazonaws.com`) và 3 role, mô tả ở dưới. |
| `budget.tf` | `aws_budgets_budget` COST, $25/tháng, gửi email tới `var.alert_email` ở 80% actual, 100% actual và 100% forecast. |

#### 🔒 `sub` của token OIDC (đã tuỳ biến)

Repo bật **OIDC subject customization** (lead chạy một lần, xem §8):
`include_claim_keys = ["repo", "context", "job_workflow_ref"]`. Từ đó `sub` có
dạng `repo:<repo>:<context>:job_workflow_ref:<repo>/.github/workflows/<file>@<ref>`.

Việc này **gắn tên file workflow vào chính `sub`**. Nhờ vậy, code `npm` chạy
trong `deploy.yml` không thể lấy token hợp lệ cho role tf-apply, dù chạy cùng
environment (audit HIGH-2). Nếu định dạng `sub` sai thì assume bị từ chối, tức
là hỏng ở trạng thái đóng (an toàn). Lần assume đầu tiên trong CI là bước kiểm
chứng.

**Repo dùng immutable subject (audit round 2, HIGH-A).** Đọc bằng
`GET /repos/DuckHweeee/maeven/actions/oidc/customization/sub`, ngày
2026-10-05, kết quả là `use_immutable_subject: true` và
`sub_claim_prefix = repo:DuckHweeee@97320339/maeven@1364584916`.
Vì vậy đoạn `repo:` của `sub` mang cả owner_id và repo_id.

Mọi trust policy **chấp nhận cả hai dạng** của đoạn repo. `StringEquals` hoặc
`StringLike` với nhiều giá trị là phép OR. Hai dạng đó là:
- `var.github_repository` = `DuckHweeee/maeven`
- `var.github_repository_immutable` = `DuckHweeee@97320339/maeven@1364584916`

ID trong dạng thứ hai là thông tin công khai, không phải bí mật.

`job_workflow_ref` luôn dùng tên `DuckHweeee/maeven/...`. Nếu probe cho thấy
khác thì lead sửa file này.

**Bằng chứng bắt buộc trước bootstrap:** workflow `oidc-probe.yml` (xem §8)
in ra `sub` thật trong ba context: `pull_request`, `ref:refs/heads/main` và
`environment:staging`. Chuỗi trong trust policy phải khớp từng ký tự với các
giá trị in ra đó.

Viết tắt dùng trong bảng dưới:
- `R` = **mỗi** dạng repo ở trên (sinh ra một giá trị cho mỗi dạng);
- `W(f,ref)` = `job_workflow_ref:DuckHweeee/maeven/.github/workflows/<f>@<ref>`.

**Role cho Terraform trong CI** (đều có điều kiện `aud = sts.amazonaws.com`):

| Role | Trust `sub` | Quyền |
|---|---|---|
| `maeven-tf-plan` | `StringLike`, một trong hai giá trị: `repo:R:pull_request:W(terraform.yml,refs/pull/*/merge)` hoặc `repo:R:ref:refs/heads/main:W(terraform.yml,refs/heads/main)` | Managed `ReadOnlyAccess`, cộng Deny `s3:GetObject` trên `<state>/bootstrap/*` và `maeven-*-logs-*/*`. **Không** có quyền ghi lockfile, vì plan luôn chạy `-lock=false`. |
| `maeven-tf-apply-staging` | `StringEquals` `repo:R:environment:staging:W(terraform.yml,refs/heads/main)` | Policy `maeven-tf-apply` |
| `maeven-tf-apply-prod` | `StringEquals` `repo:R:environment:production:W(terraform.yml,refs/heads/main)` | Policy `maeven-tf-apply` |

**Policy `maeven-tf-apply`:**
- Quản lý `cloudfront`, `wafv2`, `acm`, `cloudwatch` và `logs` (chỉ log delivery).
- `sns` giới hạn trong `maeven-*`.
- S3 giới hạn trong các bucket site và logs.
- `route53` giới hạn trong zone của `maeven.vn`.
- State bucket chỉ đọc/ghi object dưới `staging/*` và `prod/*`. **Không được
  đụng `bootstrap/*`** (audit LOW-2).
- **IAM: danh sách action tường minh**, không dùng wildcard `*Role*`, trên
  `role/maeven-*`:
  - **Bắt buộc có boundary** (điều kiện `ArnEquals iam:PermissionsBoundary`):
    CreateRole, PutRolePermissionsBoundary, PutRolePolicy,
    **UpdateAssumeRolePolicy, UpdateRole, DeleteRole, DeleteRolePolicy**.
    Nhờ vậy, role `maeven-*` không có boundary không thể bị CI chiếm quyền
    (audit round 2, MEDIUM-A).
  - **Không cần điều kiện:** GetRole, UpdateRoleDescription, TagRole,
    UntagRole, ListRoleTags, GetRolePolicy, ListRolePolicies,
    ListAttachedRolePolicies, ListInstanceProfilesForRole.
  - **Quy ước:** role tạo tay (ví dụ Lambda của `/api/*` sau này) **không được**
    đặt tiền tố `maeven-`. Tiền tố này dành riêng cho role do CI quản lý.

  Không có `PassRole`, `AttachRolePolicy` hay `DetachRolePolicy`: module chỉ
  dùng inline policy.
- **Permissions boundary bắt buộc** (audit HIGH-1):
  - `iam:CreateRole` và `iam:PutRolePermissionsBoundary` chỉ được Allow khi có
    điều kiện `iam:PermissionsBoundary = arn:…:policy/maeven-deploy-boundary`.
  - Deny `iam:DeleteRolePermissionsBoundary` trên `role/maeven-*`.
  - Boundary `maeven-deploy-boundary` (tạo ở bootstrap) chỉ cho phép hai nhóm
    quyền: S3 Get/Put/Delete/List trên `maeven-*-site-<acct>` và `/*`, và
    `cloudfront:CreateInvalidation` / `GetInvalidation`.
  - Kết quả: mọi role mà CI tạo ra hoặc sửa đều bị chặn trần ở mức quyền
    deploy. Role nào thiếu boundary thì không sửa được inline policy, vì
    PutRolePolicy cũng kèm điều kiện boundary.
- Deny mọi thao tác ghi IAM trên `role/maeven-tf-*`, gồm cả UpdateRoleDescription,
  TagRole, UntagRole, PassRole và các action boundary.
- `iam:ListOpenIDConnectProviders`; `iam:GetOpenIDConnectProvider` trên
  `oidc-provider/*`.

`aws_iam_openid_connect_provider.github` có `prevent_destroy`.

> **Rủi ro chấp nhận:**
> - Hai role apply có cùng quyền. Cùng account nên CloudFront/WAF không phân
>   quyền theo env được bằng ARN. Role staging (không cần duyệt) về lý thuyết
>   sửa được distribution của prod, nhưng **không leo được lên admin**. Ranh giới
>   còn lại là GitHub Environment `production` có reviewer, cộng với việc chỉ
>   `terraform.yml@main` mới assume được. Muốn tách cứng thì phải tách account
>   (ngoài phạm vi).
> - Account ID không phải bí mật theo AWS. Ta không commit nó vào repo public,
>   nhưng chấp nhận nó lộ trong log Actions qua tên bucket và ARN.

🔒 **Outputs của bootstrap:**
- `state_bucket_name`
- `hosted_zone_id`, `name_servers`
- `github_oidc_provider_arn`
- `deploy_boundary_policy_arn`
- `tf_plan_role_arn`
- `tf_apply_role_arns` (map, khoá `staging`, `prod`)

🔒 **Variables của bootstrap:**
- `project_name` (mặc định `"maeven"`)
- `aws_region` (mặc định `"ap-southeast-1"`)
- `domain_name` (mặc định `"maeven.vn"`)
- `github_repository` (mặc định `"DuckHweeee/maeven"`)
- `alert_email` (bắt buộc, `sensitive`)
- `monthly_budget_usd` (mặc định `25`)

## 6. Module `static-site`

### 🔒 Variables

| Tên | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `project_name` | string | `"maeven"` | |
| `environment` | string | — | validation: `staging` hoặc `prod` |
| `domain_name` | string | — | FQDN chính của env, ví dụ `staging.maeven.vn`, `maeven.vn` |
| `hosted_zone_name` | string | `"maeven.vn"` | lookup bằng data source |
| `include_www` | bool | `false` | prod đặt `true` |
| `price_class` | string | `"PriceClass_200"` | |
| `noindex` | bool | `false` | staging đặt `true` |
| `enable_waf` | bool | `false` | |
| `waf_block_mode` | bool | `false` | `false` thì mọi rule ở chế độ Count |
| `waf_rate_limit` | number | `2000` | số request / 5 phút / IP |
| `alert_email` | string | — | `sensitive` |
| `log_retention_days` | number | `90` | |
| `github_repository` | string | `"DuckHweeee/maeven"` | |
| `github_environment` | string | — | `staging` hoặc `production` |
| `extra_origins` | list(object) | `[]` | dự phòng cho `/api/*`, phải lặp bằng `dynamic` |
| `ordered_behaviors` | list(object) | `[]` | như trên |

### 🔒 Outputs

| Tên | Ghi chú |
|---|---|
| `bucket_name` | |
| `cloudfront_distribution_id` | |
| `cloudfront_url` | |
| `site_url` | `https://<domain_name>` |
| `deploy_role_arn` | |
| `logs_bucket_name` | |
| `alarm_topic_arn` | |
| `web_acl_arn` | `null` khi WAF tắt |

`envs/<env>/outputs.tf` re-export đúng các tên trên.

### Yêu cầu từng file

1. **`s3.tf`** — giữ toàn bộ cấu hình bucket hiện có (private, SSE, versioning,
   lifecycle 30 ngày cho noncurrent). Bucket policy cho `cloudfront.amazonaws.com`
   (điều kiện `AWS:SourceArn` = distribution) có cả **`s3:GetObject` và
   `s3:ListBucket`**, để key thiếu trả về 404 thật thay vì 403.
2. **`cloudfront.tf`**:
   - Giữ OAC, `http2and3`, IPv6, `CachingOptimized`, `redirect-to-https`,
     `compress`.
   - **Chỉ còn** `custom_error_response` 404 → `/404.html`. Bỏ 403.
   - `aliases`: `[domain_name]`, cộng `www.<domain_name>` khi `include_www`.
   - Gắn `web_acl_id` khi bật WAF.
   - `dynamic "origin"` / `dynamic "ordered_cache_behavior"` lặp theo hai biến
     dự phòng.
3. **`functions/viewer_request.js`** (`cloudfront-js-2.0`):
   - Nếu header `host` bắt đầu bằng `www.` → trả **301** về
     `https://<host bỏ www.><uri>`, giữ nguyên querystring.
   - Ngoài ra giữ đúng logic của `rewrite.js` cũ: `/` → `/index.html`, bỏ `/`
     cuối, segment cuối không có dấu `.` thì thêm `.html`.
4. **`headers.tf`** — một `aws_cloudfront_response_headers_policy` riêng thay
   cho Managed-SecurityHeadersPolicy:
   - HSTS `max-age=31536000; includeSubDomains`, **không** preload
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()` (custom header)
   - `Content-Security-Policy-Report-Only` (custom header, chưa enforce). Giá trị
     khởi điểm:
     `default-src 'self'; img-src 'self' data:; media-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
   - Khi `noindex = true`: thêm `X-Robots-Tag: noindex, nofollow`.
5. **`waf.tf`** (`count = enable_waf ? 1 : 0`, scope `CLOUDFRONT`, provider us-east-1):
   - Rule `AWSManagedRulesAmazonIpReputationList`,
     `AWSManagedRulesCommonRuleSet`, `AWSManagedRulesKnownBadInputsRuleSet`
   - Rate-based rule theo IP, ngưỡng `waf_rate_limit`
   - Khi `waf_block_mode = false`: managed rule dùng `override_action { count {} }`,
     rate rule dùng `action { count {} }`
   - Bật CloudWatch metrics và sampled requests.
6. **`logging.tf`**:
   - Bucket `maeven-<env>-logs-<account_id>`, lifecycle xoá sau
     `log_retention_days`.
   - CloudFront standard logging v2 qua `aws_cloudwatch_log_delivery_source`
     (log_type `ACCESS_LOGS`), `_destination` (S3) và `aws_cloudwatch_log_delivery`.
     Source và delivery tạo bằng provider us-east-1.
   - Bucket policy cho `delivery.logs.amazonaws.com`.
7. **`monitoring.tf`** (us-east-1):
   - SNS topic `maeven-<env>-alerts` với subscription email.
   - Alarm trên namespace `AWS/CloudFront`, dimensions
     `DistributionId` + `Region=Global`:
     - `5xxErrorRate` > 1, 2 chu kỳ × 300 giây
     - `4xxErrorRate` > 15, 3 chu kỳ × 300 giây
   - Khi bật WAF: alarm `BlockedRequests` (namespace `AWS/WAFV2`) > 500 trong 5 phút.
   - `treat_missing_data = "notBreaching"`.
8. **`domain.tf`**:
   - Data source `aws_route53_zone` (không tạo zone).
   - ACM ở us-east-1, validate qua DNS.
   - Bản ghi A + AAAA alias cho mỗi alias.
   - Giữ kỹ thuật khoá `for_each` theo danh sách alias tĩnh như code cũ.
9. **`deploy_role.tf`**:
   - Tìm OIDC provider bằng `data "aws_iam_openid_connect_provider"` với
     `url = "https://token.actions.githubusercontent.com"`. Không nhận ARN qua
     biến, để account ID không lọt vào tfvars được commit.
   - Role `maeven-<env>-deploy`, trust `sub = repo:<github_repository>:environment:<github_environment>`
     và `aud = sts.amazonaws.com`.
   - Quyền như code cũ: `ListBucket` trên bucket; `Get/Put/DeleteObject` trên
     `bucket/*`; `CreateInvalidation`/`GetInvalidation` trên đúng distribution.

### Bổ sung sau audit lần 1 (2026-10-05)

10. **`deploy_role.tf`**:
    - Trust `sub` (StringEquals) =
      `repo:<github_repository>:environment:<github_environment>:job_workflow_ref:<github_repository>/.github/workflows/deploy.yml@refs/heads/main`.
    - `permissions_boundary` = ARN của `maeven-deploy-boundary`. ARN dựng từ
      `data.aws_caller_identity`, không truyền qua biến.
11. **`logging.tf`**: `aws:SourceArn` thu hẹp từ `delivery-source:*` về
    `delivery-source:${name_prefix}-*` (audit LOW-3).
12. **`waf.tf` + `monitoring.tf`**: tên web ACL và `metric_name` dùng chung một
    `local` (audit LOW-4). `waf_rate_limit` có validation `>= 10`.
13. **`s3.tf`**: thêm Deny non-TLS vào bucket site, cho đồng bộ với các bucket khác.
14. **`viewer_request.js`**:
    - Chỉ thêm `encodeURIComponent` nếu tài liệu AWS về event của
      cloudfront-js-2.0 xác nhận giá trị querystring **đã được decode**.
    - Nếu giá trị vẫn ở dạng encoded như lúc nhận thì giữ nguyên code và ghi một
      dòng comment dẫn nguồn, vì encode thêm lần nữa sẽ hỏng query (audit LOW-5).
15. **`.gitignore`**: thêm `infra/**/tfplan`.

### Chế độ chưa có tên miền (thêm 2026-10-05)

Chủ repo chưa mua tên miền, nên module phải chạy được với **domain CloudFront**
(`*.cloudfront.net`) và chuyển sang tên miền riêng sau chỉ bằng một PR.

16. **`domain_name` có thể để trống** (`default = ""`), và `local.use_custom_domain = var.domain_name != ""`:
    - Để trống thì **không** tạo ACM cert, bản ghi xác thực, bản ghi A/AAAA,
      và **không** tra `aws_route53_zone`. `aliases = []`.
    - `viewer_certificate` dùng `cloudfront_default_certificate = true`. Khi đó
      không được đặt `ssl_support_method` hay `minimum_protocol_version`.
    - `include_www` bị bỏ qua khi không có domain (validation hoặc `&&` trong local).
    - Output `site_url` trả `https://<distribution>.cloudfront.net` khi không có
      domain, ngược lại trả `https://<domain_name>`.
    - Dùng cùng một kỹ thuật `count` như code `domain.tf` ban đầu: khoá theo giá
      trị biết ở thời điểm plan.
    - Nếu `trivy` báo TLS policy của cert mặc định (AWS-0010), thêm vào
      `.trivyignore` kèm lý do: cert mặc định của CloudFront không cho chọn policy.
17. **`envs/*/terraform.tfvars`**: bỏ `domain_name` (staging, prod) và `include_www`
    (prod). Chú thích rõ cách bật lại khi đã có tên miền.
18. **Bootstrap giữ nguyên** (zone `maeven.vn` đã tồn tại, phí $0.50/tháng).
    Khi có tên miền thật, bootstrap cần đổi `domain_name`. Zone có
    `prevent_destroy`, nên đổi tên miền là một quyết định có chủ đích (xem README).
19. **CI**:
    - `SITE_URL` của build không còn hard-code. `build-staging` và `build-prod`
      (không có environment) đọc **biến cấp repo** `SITE_URL_STAGING` và
      `SITE_URL_PROD`.
    - `deploy-*` vẫn đọc `vars.SITE_URL` của environment, và **thất bại nếu hai
      giá trị khác nhau**.
    - Nếu biến trống thì thất bại ngay với thông báo rõ ràng (đừng build ra
      canonical sai).
    - `smoke.sh` tự bỏ qua check 4 (www) khi `SMOKE_EXPECT_WWW` không đặt, đúng
      như hiện tại. Các check còn lại chạy được trên domain CloudFront.

## 7. Môi trường (`envs/staging`, `envs/prod`)

`versions.tf` (khác nhau ở `key`):

```hcl
backend "s3" {
  key          = "<env>/site.tfstate"
  region       = "ap-southeast-1"
  use_lockfile = true
  # bucket truyền khi init:
  #   -backend-config="bucket=maeven-tfstate-<account_id>"
}
```

`terraform.tfvars`:

| | staging | prod |
|---|---|---|
| `environment` | `staging` | `prod` |
| `domain_name` | `staging.maeven.vn` | `maeven.vn` |
| `include_www` | — | `true` |
| `noindex` | `true` | — |
| `enable_waf` | — | `true` |
| `waf_block_mode` | — | `false` |
| `github_environment` | `staging` | `production` |

## 8. CI/CD

### 🔒 Biến GitHub

| Phạm vi | Biến |
|---|---|
| **Repo variables** | `AWS_REGION` (`ap-southeast-1`), `TF_STATE_BUCKET`, `AWS_TF_PLAN_ROLE_ARN` |
| **Repo secret** | `ALERT_EMAIL`. Đây là secret duy nhất: biến thường hiện trong log công khai (audit MEDIUM-3). |
| **Environment `staging` / `production`** | `AWS_TF_APPLY_ROLE_ARN`, `AWS_DEPLOY_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `SITE_URL` |

Mọi quyền AWS đều đi qua OIDC.

**Workflow `oidc-probe.yml`:**
- Trigger: chỉ `workflow_dispatch` và `pull_request` có sửa đúng file này.
- Không gọi AWS, không dùng secret.
- Mỗi job xin token OIDC với `aud = sts.amazonaws.com` và chỉ in ra claim
  `sub` cùng `job_workflow_ref`. Không bao giờ in cả token.
- Có hai job:
  - Không có environment: thấy `ref:refs/heads/main` khi dispatch, hoặc
    `pull_request` khi chạy trên PR.
  - Có `environment: staging`.

**Thiết lập repo** (lead làm, **trước** khi bootstrap apply; audit HIGH-3):
1. Tạo environment `staging` và `production`. Chính sách nhánh deploy: chỉ `main`.
   `production` có required reviewer.
2. Bảo vệ nhánh `main`: bắt buộc qua PR, cấm force push.
3. Bật OIDC subject customization:
   `PUT /repos/DuckHweeee/maeven/actions/oidc/customization/sub` với
   `{"use_default":false,"include_claim_keys":["repo","context","job_workflow_ref"]}`.

### `.github/workflows/terraform.yml` (mới)

**Trigger:**
- `pull_request`: **không** lọc `paths` (audit round 2, MEDIUM-C). Một bước
  đầu tiên tự phát hiện thay đổi trong `infra/**` hoặc `terraform.yml` bằng
  `git diff` so với base. Nếu không có thay đổi thì bỏ qua các bước nặng nhưng
  job vẫn báo success. Nhờ vậy, required check không bị treo ở trạng thái
  "Expected".
- `push` vào `main` có sửa `infra/**`
- `workflow_dispatch`

**Job `check`:**
1. `terraform fmt -check -recursive infra`
2. `tflint --recursive`
3. `trivy config --exit-code 1 --severity HIGH,CRITICAL infra`

Các ngoại lệ ghi trong `infra/.trivyignore` kèm lý do.

**Job `plan`** (matrix: staging, prod; chạy trên PR):
1. Assume `AWS_TF_PLAN_ROLE_ARN`.
2. `init -backend-config=bucket=$TF_STATE_BUCKET`, rồi `validate`, rồi
   `plan -lock=false`.
3. Đăng plan vào PR bằng một comment, cập nhật lại comment cũ thay vì tạo mới.
4. **Che dữ liệu nhạy cảm ngay trong `github-script`**, không phụ thuộc AWS:
   regex `\b\d{12}\b` → `<account-id>`. Nếu bước che hỏng thì không đăng
   comment (audit MEDIUM-2).

**Job `plan-prod`** (push vào `main`, không có environment, chạy trước cổng duyệt):
- Assume `AWS_TF_PLAN_ROLE_ARN`, chạy `plan -lock=false` cho prod.
- Ghi plan đã che vào **job summary**, để reviewer đọc trước khi duyệt
  (audit MEDIUM-1).
- Không upload file plan làm artifact: artifact của repo public là công khai.

**Job `apply-staging` và `apply-prod`** (push vào `main`):
- `apply-staging` chạy song song với `plan-prod`.
- `apply-prod` cần cả `apply-staging` và `plan-prod` xong trước.
- Dùng `environment: staging` / `environment: production` và assume
  `AWS_TF_APPLY_ROLE_ARN` của environment đó.
- Chạy `plan -out`, rồi `apply` file plan đó.

### `.github/workflows/deploy.yml` (sửa)

**Trigger:**
- `push` vào `main`, có `paths-ignore: infra/**`. Thay đổi chỉ ở hạ tầng không
  deploy lại site, nên hai workflow không đua nhau.
- `workflow_dispatch` với input `ref` (mặc định `main`), dùng để rollback.

**Kiểm tra `ref` khi rollback** (audit round 2, MEDIUM-B):
- `build-*` checkout với `fetch-depth: 0` và **bắt buộc** chạy
  `git merge-base --is-ancestor HEAD origin/main`. Commit không nằm trên `main`
  thì thất bại.
- `run-name` hiển thị `ref`, để reviewer thấy mình đang duyệt bản nào.

**Không chấp nhận symlink** (audit round 2, LOW-B): job deploy thất bại nếu
`out/` chứa symlink, và `deploy.sh` dùng `--no-follow-symlinks`.

**Che dữ liệu** (audit round 2, LOW-A):
- Thay số: regex `(?<!\d)\d{12}(?!\d)`.
- Kiểm tra sau khi che: nếu vẫn còn bất kỳ chuỗi `\d{12}` nào thì thất bại.

**Tách build khỏi deploy** (audit HIGH-2). Code bên thứ ba (`npm ci`, build)
không bao giờ chạy trong job có `id-token: write`.

- **`build-<env>`**:
  - Chỉ có `contents: read`. Không có `id-token`, không có environment.
  - Checkout `ref`, chạy `npm ci`, rồi `NEXT_PUBLIC_SITE_URL=<url của env> npm run build`.
  - Upload `out/` làm artifact.
  - `SITE_URL` của env đọc ở đây. Vì job không có environment, URL lấy từ
    `vars` cấp repo, hoặc hard-code trong matrix (URL là thông tin công khai).
- **`deploy-<env>`**:
  - Có `environment`, `id-token: write` và `needs: build-<env>`.
  - Download artifact.
  - Checkout chỉ `scripts/`, và ở **`main`**, không phải `ref`, để rollback vẫn
    có `smoke.sh` mới nhất.
  - Assume `AWS_DEPLOY_ROLE_ARN`, chạy `./scripts/deploy.sh`, rồi
    `./scripts/smoke.sh "$SITE_URL"`.
- Thứ tự: `build-staging → deploy-staging → build-prod → deploy-prod`.
  `build-prod` có thể chạy song song với staging.

**Yêu cầu chung:**
- `concurrency: deploy-<env>`, không cancel run đang chạy.
- Pin mọi action theo commit SHA, kèm comment ghi version.
- Mức workflow chỉ có `contents: read`.
- `id-token: write` khai báo **theo từng job**, chỉ cho những job assume role.
- `pull-requests: write` chỉ cho job `plan`.

### `scripts/deploy.sh`

Giữ logic cache và sync hiện tại. Khi thiếu biến môi trường thì fallback sang
`terraform -chdir="infra/envs/${ENV:-prod}" output -raw …`.

### `scripts/smoke.sh <base_url>` (mới)

Thoát với mã ≠ 0 khi có bất kỳ kiểm tra nào hỏng, và in rõ kiểm tra nào hỏng.
Danh sách kiểm tra:

1. Trả **200**: `/`, `/magazine`, `/product`, `/about-us`, `/credits`, một
   `/product/<sku>` và một `/article/<slug>`. SKU và slug đầu tiên lấy từ
   `out/` nếu có, nếu không thì lấy từ `src/lib/data.ts`.
2. `/khong-ton-tai-<random>` trả **404**, body chứa đoạn đặc trưng của `404.html`.
3. `http://<host>/` trả **301** sang `https://`.
4. Nếu `SMOKE_EXPECT_WWW=1`: `https://www.<host>/magazine?q=a%20b` trả **301**,
   và `Location` phải **chứa nguyên** `q=a%20b`. Đây là cách phát hiện lỗi
   decode hoặc encode querystring (audit round 2, LOW-C).
5. Header `strict-transport-security` có mặt.
6. `x-robots-tag` có mặt khi `SMOKE_EXPECT_NOINDEX=1`, và **vắng mặt** khi không.
7. Cache-Control: một file `/_next/static/...` có `immutable`; HTML có `max-age=0`.
8. HTML trang chủ có `<link rel="canonical"` trỏ về `<base_url>`. Điều này chứng
   minh `NEXT_PUBLIC_SITE_URL` đã được truyền vào khi build.

## 9. Định nghĩa "xong" cho mỗi thay đổi

- `terraform fmt -check -recursive infra` sạch.
- `terraform -chdir=<root> init -backend=false && terraform -chdir=<root> validate`
  pass cho `bootstrap`, `envs/staging`, `envs/prod`.
- `tflint --recursive` sạch.
- `trivy config infra` không có HIGH/CRITICAL nào ngoài `.trivyignore`.
- `actionlint` và `shellcheck scripts/*.sh` sạch.
- infra-security-auditor không còn finding mức High trở lên chưa xử lý.

## 10. Phân vai

| Ai | Làm gì |
|---|---|
| **Lead (Opus + chủ repo)** | Sửa DESIGN.md, review mọi PR, chạy bootstrap apply và apply đầu tiên, duyệt prod. |
| **terraform-engineer** (Sonnet) | `infra/**` trừ DESIGN.md. |
| **cicd-engineer** (Sonnet) | `.github/workflows/**`, `scripts/deploy.sh`, `scripts/smoke.sh`. |
| **infra-security-auditor** (Sonnet, chỉ đọc) | Review bảo mật và chi phí trước mỗi lần lead apply. |
| **deploy-verifier** (Sonnet, chỉ đọc) | Kiểm tra site đang chạy sau mỗi lần deploy. |
