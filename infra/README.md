# Deploy MAEVEN lên AWS bằng Terraform

Toàn bộ site đều là trang tĩnh (mọi route `/product/[sku]` và `/article/[slug]`
đã có `generateStaticParams`), nên `next build` xuất ra thư mục `out/` với
`output: "export"`. Không cần server Node — chỉ cần:

```
Trình duyệt ──HTTPS──▶ CloudFront (CDN, TLS, nén, security headers)
                          │  CloudFront Function: /magazine → /magazine.html
                          ▼
                     S3 bucket riêng tư (chỉ CloudFront đọc được, qua OAC)
```

Chi phí cho lưu lượng nhỏ thường chỉ vài USD/tháng (S3 ~14 MB + phí truyền
dữ liệu CloudFront; tài khoản mới có free tier 1 TB/tháng cho CloudFront).

| File | Nội dung |
|---|---|
| `versions.tf` | Terraform ≥ 1.10, AWS provider 6.x, provider phụ ở `us-east-1` cho chứng chỉ ACM |
| `main.tf` | S3 bucket (private, mã hoá, versioning), CloudFront + OAC, function rewrite, trang 404 |
| `domain.tf` | *(tuỳ chọn)* tên miền riêng: chứng chỉ ACM + bản ghi Route 53 |
| `github_oidc.tf` | *(tuỳ chọn)* IAM role cho GitHub Actions deploy không cần access key |
| `functions/rewrite.js` | Map URL sạch sang file `.html` do Next.js xuất ra |
| `outputs.tf` | Tên bucket, ID distribution, URL site |

## 0. Chuẩn bị

- Tài khoản AWS + user/role có quyền quản trị (lần đầu).
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.10.
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), đăng nhập bằng `aws configure` hoặc `aws configure sso`.

Kiểm tra: `aws sts get-caller-identity` phải in ra account ID của bạn.

## 1. Tạo hạ tầng

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # sửa nếu cần; mặc định là đủ
terraform init
terraform plan        # xem trước những gì sẽ tạo
terraform apply       # gõ "yes"
```

CloudFront mất khoảng 5–10 phút để phát hành lần đầu. Xong sẽ in ra:

```
bucket_name                = "maeven-site-123456789012"
cloudfront_distribution_id = "E1ABCDEF..."
site_url                   = "https://d1234abcd.cloudfront.net"
```

Commit file `infra/.terraform.lock.hcl` mà `terraform init` sinh ra, để mọi
người dùng cùng phiên bản provider.

## 2. Build và upload

Từ thư mục gốc repo:

```bash
npm ci
npm run build          # tạo out/
./scripts/deploy.sh    # sync lên S3 + invalidate CloudFront
```

`deploy.sh` tự đọc bucket và distribution ID từ `terraform output`. Nó đặt
`Cache-Control` theo từng loại file: chunk JS/CSS có hash cache 1 năm, ảnh cache
1 tuần, HTML luôn được trình duyệt kiểm tra lại, và mỗi lần deploy sẽ invalidate
`/*` trên CloudFront.

Mở `site_url` để kiểm tra.

## 3. (Tuỳ chọn) Tên miền riêng

Yêu cầu tên miền dùng DNS của Route 53 (tạo hosted zone, rồi trỏ nameserver
ở nhà đăng ký — ví dụ PA Vietnam, Mắt Bão — về 4 NS của hosted zone đó).

```hcl
# terraform.tfvars
domain_name = "maeven.vn"
include_www = true
```

`terraform apply` sẽ tạo chứng chỉ ACM ở `us-east-1`, tự xác thực qua DNS, gắn
vào CloudFront và tạo bản ghi A/AAAA cho `maeven.vn` và `www.maeven.vn`.

## 4. (Tuỳ chọn) Tự deploy khi push lên `main`

```hcl
# terraform.tfvars
github_repository    = "DuckHweeee/maeven"
github_deploy_branch = "main"
# create_github_oidc_provider = false   # nếu account đã có GitHub OIDC provider
```

Chạy `terraform apply`, rồi vào GitHub → **Settings → Secrets and variables →
Actions → Variables** và tạo:

| Variable | Giá trị |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |
| `S3_BUCKET` | `terraform output -raw bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| `AWS_REGION` | `ap-southeast-1` (hoặc region bạn chọn) |

Từ đó mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ
build và deploy. Workflow tự bỏ qua khi `AWS_DEPLOY_ROLE_ARN` chưa được đặt.
Role chỉ có quyền ghi vào đúng bucket này và invalidate đúng distribution này.

## 5. (Nên làm khi làm việc nhóm) Lưu state trên S3

Mặc định `terraform.tfstate` nằm trên máy bạn — đừng làm mất và đừng commit nó
(đã có trong `.gitignore`). Khi nhiều người cùng chạy Terraform, tạo một bucket
riêng cho state rồi bỏ comment khối `backend "s3"` trong `versions.tf`, sau đó
`terraform init -migrate-state`.

## Gỡ bỏ

Bucket bật versioning nên phải xoá sạch mọi phiên bản trước: S3 console →
chọn bucket → **Empty**. Sau đó:

```bash
terraform destroy
```

## Lưu ý

- `next.config.ts` bật `images: { unoptimized: true }` vì bộ tối ưu ảnh mặc định
  của `next/image` cần server. Ảnh trong `public/img` đã được
  `scripts/fetch-images.mjs` resize sẵn (≤ ~700 KB mỗi ảnh).
- Nếu sau này cần tính năng phía server (Server Actions, API đọc request,
  cookies, ISR…), static export sẽ không còn đủ — lúc đó chuyển sang chạy
  `next start` trong container (ECS Fargate / App Runner) phía sau CloudFront.
