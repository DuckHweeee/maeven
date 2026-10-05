# Deploy MAEVEN lên AWS bằng Terraform

Site là static export: `next build` xuất ra thư mục `out/`. Thư mục đó được đặt
trong một S3 bucket private, và CloudFront phục vụ nó ra ngoài. Có hai môi
trường, nằm chung một AWS account:

| | staging | prod |
|---|---|---|
| URL | địa chỉ CloudFront của staging (`dxxxx.cloudfront.net`) | địa chỉ CloudFront của prod, khi có tên miền thì là `maeven.vn` |
| Deploy | tự động khi merge vào `main` | sau khi bạn bấm duyệt trên GitHub |
| Khác biệt | có `X-Robots-Tag: noindex` để Google không index | có WAF chặn tấn công |

Chi phí ước tính khoảng **$11/tháng**, trong đó khoảng $9.6 là WAF của prod.
AWS Budgets gửi email khi chi tiêu chạm $20 và $25.

Tài liệu liên quan:

- Thiết kế chi tiết, quy ước và các rủi ro đã chấp nhận: [`DESIGN.md`](DESIGN.md).
- File này là **sổ tay vận hành**, viết cho người **chưa từng chạy Terraform**.

---

## Mục lục

- [Phần A — Terraform trong 5 phút](#phần-a--terraform-trong-5-phút)
- [Phần B — Triển khai lần đầu, từng bước](#phần-b--triển-khai-lần-đầu-từng-bước)
  - [Bước 1. Kiểm tra máy và tài khoản AWS](#bước-1-kiểm-tra-máy-và-tài-khoản-aws)
  - [Bước 2. Tên miền — chưa có thì dùng tạm domain CloudFront](#bước-2-tên-miền--chưa-có-thì-dùng-tạm-domain-cloudfront)
  - [Bước 3. Thiết lập GitHub](#bước-3-thiết-lập-github)
  - [Bước 4. Merge code và chạy OIDC probe](#bước-4-merge-code-và-chạy-oidc-probe)
  - [Bước 5. Bootstrap — apply Terraform lần đầu tiên](#bước-5-bootstrap--apply-terraform-lần-đầu-tiên)
  - [Bước 6. Chuyển state của bootstrap lên S3](#bước-6-chuyển-state-của-bootstrap-lên-s3)
  - [Bước 7. Trỏ nameserver về Route 53 (bỏ qua khi chưa có tên miền)](#bước-7-trỏ-nameserver-về-route-53--bỏ-qua-khi-chưa-có-tên-miền)
  - [Bước 8. Biến và secret cấp repo trên GitHub](#bước-8-biến-và-secret-cấp-repo-trên-github)
  - [Bước 9. Apply staging](#bước-9-apply-staging)
  - [Bước 10. Apply prod](#bước-10-apply-prod)
  - [Bước 11. Deploy site lần đầu và kiểm tra](#bước-11-deploy-site-lần-đầu-và-kiểm-tra)
- [Phần C — Vận hành hằng ngày](#phần-c--vận-hành-hằng-ngày)
- [Phần D — Lỗi thường gặp](#phần-d--lỗi-thường-gặp)
- [Phần E — Chuyển sang tên miền riêng](#phần-e--chuyển-sang-tên-miền-riêng)

---

## Phần A — Terraform trong 5 phút

**Terraform** đọc các file `.tf` mô tả hạ tầng *mong muốn*, ví dụ "có một S3
bucket tên X và một CloudFront trỏ vào nó". Nó so mô tả đó với những gì đang có
thật trên AWS, rồi tạo, sửa hoặc xoá để hai bên khớp nhau.

### Bốn lệnh bạn sẽ dùng

| Lệnh | Làm gì | Có thay đổi AWS không? |
|---|---|---|
| `terraform init` | Tải plugin AWS và kết nối tới nơi lưu state. Chạy lần đầu, và chạy lại khi Terraform yêu cầu. | Không |
| `terraform plan` | **Xem trước** những gì sẽ thay đổi. | Không (chỉ đọc) |
| `terraform apply` | In lại plan, hỏi `Enter a value:`, và chỉ thực hiện khi bạn gõ đúng chữ `yes`. | **Có** |
| `terraform output` | In ra các giá trị hữu ích sau khi apply, ví dụ tên bucket hay ARN. | Không |

### Đọc kết quả `plan`

| Ký hiệu | Nghĩa | Mức độ |
|---|---|---|
| `+` | tạo mới | bình thường |
| `~` | sửa tại chỗ | đọc xem sửa gì |
| `-` | **xoá** | ⚠️ dừng lại, hỏi trước khi apply |
| `-/+` | **xoá rồi tạo lại** (replace) | ⚠️ dừng lại; với bucket hay distribution, việc này có thể làm site gián đoạn |

Dòng cuối của plan là phần quan trọng nhất, ví dụ
`Plan: 19 to add, 0 to change, 0 to destroy.`

**Quy tắc vàng:** nếu số `to destroy` khác 0 mà bạn không chủ đích xoá thì
**đừng gõ `yes`**.

### State là gì

Terraform ghi lại "tôi đã tạo những gì" vào một file **state**. Mất state thì
Terraform không còn biết các resource đã có, và lần sau sẽ cố tạo trùng.

Repo này cất state trong một S3 bucket riêng: `maeven-tfstate-<account-id>`,
có versioning, có khoá chống chạy đồng thời. Ngoại lệ duy nhất là lần bootstrap
đầu tiên (bước 5), khi bucket đó chưa tồn tại.

- **Không bao giờ** sửa hay xoá file state bằng tay.
- **Không bao giờ** commit file `*.tfstate`. `.gitignore` đã chặn sẵn.

### Ba "root" trong repo

Mỗi root là một thư mục bạn chạy Terraform bên trong, và mỗi root có state
riêng:

```
infra/
  bootstrap/            chạy tay đúng 1 lần: bucket state, Route 53 zone, quyền cho GitHub, budget
  envs/staging/         môi trường staging (gọi module bên dưới)
  envs/prod/            môi trường prod (gọi module bên dưới)
  modules/static-site/  "khuôn" dùng chung: S3 + CloudFront + WAF + log + alarm. Không chạy trực tiếp.
```

Các lệnh trong file này chạy từ **thư mục gốc của repo**, với
`terraform -chdir=infra/<root> ...`. Bạn không cần `cd`.

---

## Phần B — Triển khai lần đầu, từng bước

Làm **đúng thứ tự** dưới đây. Mỗi bước có phần "✅ Kết quả đúng" để bạn tự
kiểm tra trước khi đi tiếp.

### Bước 1. Kiểm tra máy và tài khoản AWS

```bash
terraform version          # cần ≥ 1.10 (máy này đang có 1.16.4 trong ~/.local/bin)
aws --version              # AWS CLI v2
gh auth status             # GitHub CLI đã đăng nhập
aws sts get-caller-identity
```

✅ Kết quả đúng: lệnh cuối in ra `"Arn": "arn:aws:iam::<account-id>:user/huymai"`.
User này nằm trong group `Admin`, đủ quyền cho bootstrap.

Ghi chú:

- **Máy khác chưa có Terraform?** Tải file zip từ
  <https://developer.hashicorp.com/terraform/install>, giải nén ra file
  `terraform`, rồi đặt vào một thư mục có trong `PATH`.
  `brew install hashicorp/tap/terraform` sẽ lỗi nếu Command Line Tools của Xcode
  đã cũ.
- **Region:** `~/.aws/config` của bạn đặt region là `us-east-1`. Không sao, vì
  code Terraform tự chỉ định region (`ap-southeast-1` cho dữ liệu, `us-east-1`
  cho phần gắn với CloudFront).

### Bước 2. Tên miền — chưa có thì dùng tạm domain CloudFront

**Chưa mua tên miền vẫn triển khai được.** `infra/envs/*/terraform.tfvars`
không đặt `domain_name`, nên mỗi môi trường chạy bằng địa chỉ do CloudFront cấp,
dạng `https://dxxxxxxxx.cloudfront.net`, với HTTPS hợp lệ sẵn.

Khác biệt khi chưa có tên miền:

| | Có tên miền | Chưa có (hiện tại) |
|---|---|---|
| Địa chỉ | `staging.<domain>`, `<domain>` | `dxxxx.cloudfront.net` (mỗi env một địa chỉ) |
| Chứng chỉ | ACM, TLS 1.2 trở lên | chứng chỉ mặc định của CloudFront |
| `www` → apex | có | không có |
| Route 53 / DNS | cần trỏ nameserver | **bỏ qua bước 7** |

Địa chỉ CloudFront chỉ biết **sau khi apply**. Vì vậy các biến `SITE_URL*` trên
GitHub được đặt ở bước 9 và 10, không phải trước đó.

Khi mua tên miền, xem [Phần E — Chuyển sang tên miền riêng](#phần-e--chuyển-sang-tên-miền-riêng).

> 💡 Tên thương hiệu là **MAEVEN** (`maeven`). Nếu định mua `maven.io.vn`, hãy
> kiểm tra lại chính tả trước khi mua.


### Bước 3. Thiết lập GitHub

Mục đích là đảm bảo chỉ code trên `main`, chạy đúng workflow, mới lấy được
quyền AWS, và prod luôn cần bạn duyệt.

**3.1 Gắn tên file workflow vào token OIDC.** Chạy:

```bash
gh api -X PUT repos/DuckHweeee/maeven/actions/oidc/customization/sub \
  -F use_default=false -f 'include_claim_keys[]=repo' \
  -f 'include_claim_keys[]=context' -f 'include_claim_keys[]=job_workflow_ref'

gh api repos/DuckHweeee/maeven/actions/oidc/customization/sub
```

✅ Kết quả đúng: lệnh thứ hai in ra `"use_default":false` và đủ 3 claim key.

**3.2 Tạo environment.** Trên web GitHub, vào repo →
**Settings → Environments → New environment** và tạo:

- `staging`
  - **Deployment branches and tags:** chọn *Selected branches*, thêm `main`.
- `production`
  - **Deployment branches and tags:** chọn *Selected branches*, thêm `main`.
  - **Required reviewers:** chọn chính bạn.
  - **Không** bật *Prevent self-review*. Repo chỉ có một người duyệt, bật lên
    thì không ai duyệt được prod.

**3.3 Bảo vệ `main`.** Vào **Settings → Branches → Add branch ruleset** (hoặc
*Add rule*) cho `main`:

- bắt buộc qua Pull Request;
- chặn force push.

Tạm thời **chưa** đặt required status checks. Bật chúng ở bước 11.

**3.4 Quyền mặc định của Actions.** Vào **Settings → Actions → General**:

- *Fork pull request workflows*: chọn *Require approval for all outside
  collaborators*.
- *Workflow permissions*: chọn *Read repository contents and packages
  permissions*.

### Bước 4. Merge code và chạy OIDC probe

Bước này kiểm chứng định dạng token mà GitHub gửi cho AWS **trước khi** tạo
bất kỳ quyền nào dựa trên nó.

**4.1 Mở PR và đọc kết quả probe trên PR.** Mở PR từ nhánh
`feat/infra-staging-prod`. Workflow **OIDC probe** chạy trên PR.

- Job `probe (no environment)` in ra dòng `sub:`.
- Job `probe (environment staging)` sẽ **bị chặn**, vì staging chỉ cho phép
  `main`. Điều đó đúng như mong đợi.

**4.2 Merge PR vào `main`.**

- Workflow `Terraform` và `Deploy to AWS` sẽ **đỏ** sau khi merge, vì chưa có
  role hay biến nào. Điều này dự kiến từ trước, không phải lỗi.

**4.3 Chạy probe trên `main`.** Vào **Actions → OIDC probe → Run workflow**,
chọn branch `main`.

**4.4 So kết quả từng ký tự.** Các dòng `sub:` phải có **đúng dạng** dưới đây.
Chỗ ghi `oidc-probe.yml` sẽ là `terraform.yml` hoặc `deploy.yml` khi chạy thật.

```
PR:                repo:DuckHweeee@97320339/maeven@1364584916:pull_request:job_workflow_ref:DuckHweeee/maeven/.github/workflows/oidc-probe.yml@refs/pull/<số PR>/merge
main, no env:      repo:DuckHweeee@97320339/maeven@1364584916:ref:refs/heads/main:job_workflow_ref:DuckHweeee/maeven/.github/workflows/oidc-probe.yml@refs/heads/main
main, staging:     repo:DuckHweeee@97320339/maeven@1364584916:environment:staging:job_workflow_ref:DuckHweeee/maeven/.github/workflows/oidc-probe.yml@refs/heads/main
```

Đoạn đầu cũng có thể là `repo:DuckHweeee/maeven:`. Trust policy chấp nhận cả
hai dạng.

- ✅ **Khớp:** sang bước 5.
- ❌ **Lệch** (ví dụ phần `job_workflow_ref` cũng chứa `@97320339`): **dừng
  lại**. Gửi output cho Claude để sửa `DESIGN.md` §5 và code trước khi
  bootstrap.

### Bước 5. Bootstrap — apply Terraform lần đầu tiên

Bước này tạo 19 resource:

- bucket chứa state;
- Route 53 hosted zone cho `maeven.vn`;
- OIDC provider của GitHub;
- 3 IAM role cho Terraform trong CI, cùng policy và permissions boundary;
- budget $25/tháng.

**5.1 Khai báo email nhận cảnh báo.** `export` chỉ có hiệu lực trong cửa sổ
terminal hiện tại. Mở terminal mới thì phải chạy lại.

```bash
export TF_VAR_alert_email="email-cua-ban@example.com"
```

**5.2 `init`:**

```bash
terraform -chdir=infra/bootstrap init
```

✅ Kết quả đúng: `Terraform has been successfully initialized!`

**5.3 `plan`:**

```bash
terraform -chdir=infra/bootstrap plan
```

✅ Kết quả đúng: dòng cuối là `Plan: 19 to add, 0 to change, 0 to destroy.`
Kết quả này đã được chạy thử trên account của bạn ngày 2026-10-05.

**5.4 `apply`:**

```bash
terraform -chdir=infra/bootstrap apply
```

1. Terraform in lại plan và hỏi `Do you want to perform these actions?`.
2. Đọc lại số dòng `Plan:` rồi gõ `yes`.
3. Lệnh mất khoảng 1–2 phút.

✅ Kết quả đúng: `Apply complete! Resources: 19 added, 0 changed, 0 destroyed.`,
theo sau là danh sách `Outputs:`.

**5.5 Lưu kết quả.**

```bash
terraform -chdir=infra/bootstrap output
```

Chụp lại hoặc lưu output ở chỗ riêng, **không** commit. Bạn sẽ cần các giá trị
`name_servers`, `state_bucket_name`, `tf_plan_role_arn` và `tf_apply_role_arns`.

> Nếu bị ngắt giữa chừng (mất mạng, Ctrl-C): **đừng xoá gì cả**. Chạy lại đúng
> lệnh `apply`. Terraform đọc state và chỉ làm nốt phần còn thiếu.

### Bước 6. Chuyển state của bootstrap lên S3

Hiện state của bootstrap là file `infra/bootstrap/terraform.tfstate` trên máy
bạn. Bước này chuyển nó vào bucket vừa tạo, để không mất khi đổi máy.

**6.1 Lưu tên bucket trước khi sửa code.** Sau khi sửa `versions.tf`, lệnh
`terraform output` sẽ ngừng chạy cho tới khi `init` lại.

```bash
STATE_BUCKET=$(terraform -chdir=infra/bootstrap output -raw state_bucket_name)
echo "$STATE_BUCKET"        # phải in ra maeven-tfstate-<số account>
```

**6.2 Bỏ comment khối `backend "s3"`.** Mở `infra/bootstrap/versions.tf`, bỏ
dấu `#` ở đầu các dòng của khối này:

```hcl
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
  }
```

Hai dòng comment `# bucket passed at init` bên trong khối có thể giữ nguyên.

**6.3 Chuyển state:**

```bash
terraform -chdir=infra/bootstrap init -migrate-state -backend-config="bucket=$STATE_BUCKET"
```

Terraform hỏi *"Do you want to copy existing state to the new backend?"*. Gõ
`yes`.

**6.4 Kiểm tra:**

```bash
terraform -chdir=infra/bootstrap plan
```

✅ Kết quả đúng: `No changes. Your infrastructure matches the configuration.`

**6.5 Dọn file local.** Sao lưu file state local ra ngoài repo rồi xoá:

```bash
mkdir -p ~/maeven-tfstate-backup
mv infra/bootstrap/terraform.tfstate* ~/maeven-tfstate-backup/
```

**6.6 Commit.** Commit thay đổi `versions.tf` qua một PR nhỏ.

### Bước 7. Trỏ nameserver về Route 53 — BỎ QUA khi chưa có tên miền

Chỉ làm bước này khi đã có tên miền, xem
[Phần E](#phần-e--chuyển-sang-tên-miền-riêng). Chưa có thì sang bước 8.


### Bước 8. Biến và secret cấp repo trên GitHub

Có thể làm ngay:

```bash
gh variable set AWS_REGION           --body "ap-southeast-1"
gh variable set TF_STATE_BUCKET      --body "$(terraform -chdir=infra/bootstrap output -raw state_bucket_name)"
gh variable set AWS_TF_PLAN_ROLE_ARN --body "$(terraform -chdir=infra/bootstrap output -raw tf_plan_role_arn)"
gh secret   set ALERT_EMAIL          # gh sẽ hỏi giá trị: nhập email, không hiện ra màn hình
```

`ALERT_EMAIL` là **secret**, không phải variable. Biến thường bị in ra trong
log công khai của repo public.

Hai biến `SITE_URL_STAGING` và `SITE_URL_PROD` **chưa đặt được lúc này**, vì
địa chỉ CloudFront chưa tồn tại. Chúng được đặt ở bước 9 và 10.


### Bước 9. Apply staging

Không cần DNS. Có thể chạy ngay.

**9.1 Dọn lần apply dở.** Lần apply đầu bị treo vì code cũ đòi chứng chỉ cho
`staging.maeven.vn`. Xoá file plan cũ (nó không còn hợp lệ với code mới):

```bash
rm -f infra/envs/staging/tfplan
```

**9.2 `init` và `plan`:**

```bash
export TF_VAR_alert_email="email-cua-ban@example.com"   # nếu đã mở terminal mới
STATE_BUCKET=$(terraform -chdir=infra/bootstrap output -raw state_bucket_name)

terraform -chdir=infra/envs/staging init -backend-config="bucket=$STATE_BUCKET"
terraform -chdir=infra/envs/staging plan -out=tfplan
```

✅ Kết quả đúng (đã chạy thử trên state thật của bạn ngày 2026-10-05):
`Plan: 7 to add, 1 to change, 2 to destroy.`

**Hai dòng xoá (`-`) là chủ ý**, vì chúng là phần còn lại của lần apply treo:

- `module.site.aws_acm_certificate.site[0]` (chứng chỉ `staging.maeven.vn` đang
  chờ xác thực);
- `module.site.aws_route53_record.cert_validation["staging.maeven.vn"]` (một
  bản ghi trong zone `maeven.vn`).

Đây là ngoại lệ duy nhất của quy tắc "`to destroy` phải bằng 0". Còn lại:

- `aws_cloudfront_distribution.site` được **tạo mới**. Đây là phần quan trọng
  nhất, vì lần apply trước chưa tạo được nó.
- `aws_cloudfront_response_headers_policy.site` sửa tại chỗ (chỉ đổi dòng
  `comment`).
- Không có `aws_wafv2_web_acl` (staging không có WAF), và `site_url` ghi là
  `(known after apply)`.

**Dừng lại và gửi plan cho Claude nếu** thấy xoá hay thay thế (`-/+`) bất kỳ
thứ gì khác: S3 bucket, IAM role, CloudFront. Riêng dòng
`aws_sns_topic_subscription.email must be replaced` nghĩa là `TF_VAR_alert_email`
của bạn **khác** email đã dùng lần trước: hãy `export` lại đúng email cũ.

**9.3 Apply đúng plan vừa xem:**

```bash
terraform -chdir=infra/envs/staging apply tfplan
```

Khi apply file plan đã lưu, Terraform **không hỏi `yes`** nữa. Lần này mất
khoảng **5–15 phút**, chủ yếu do CloudFront. Thấy
`Still creating... [5m0s elapsed]` là bình thường.

**9.4 Lấy địa chỉ staging và đặt biến.** Sau khi xong:

1. **Bấm link xác nhận** trong email "AWS Notification - Subscription
   Confirmation". Đó là kênh nhận alarm của staging.
2. In địa chỉ:

   ```bash
   terraform -chdir=infra/envs/staging output -raw site_url   # https://dxxxx.cloudfront.net
   ```

3. Đặt toàn bộ biến của staging bằng **một lệnh**:

   ```bash
   ./scripts/set-github-vars.sh staging
   ```

   Script lấy giá trị thẳng từ Terraform và **từ chối ghi** nếu giá trị sai
   định dạng. Nó chạy bằng bash dù terminal của bạn là zsh. Muốn xem trước mà
   chưa ghi gì thì thêm `DRY_RUN=1` ở đầu lệnh.

   > ⚠️ **Đừng gõ tay hay copy giá trị từ màn hình terminal.** Hai lỗi đã gặp:
   > - zsh thêm dấu `%` ở cuối khi lệnh in ra không có xuống dòng. Copy cả dấu
   >   đó vào biến làm build thất bại (`must look like https://host`).
   > - Các lệnh kiểu `O="terraform ... output -raw"; $($O tên_output)` **chỉ chạy
   >   trên bash**, còn zsh không tách chuỗi theo khoảng trắng. Kết quả là biến bị
   >   điền sai, ví dụ `AWS_DEPLOY_ROLE_ARN` chứa một URL, và deploy báo
   >   `Source Account ID is needed if the Role Name is provided and not the Role Arn`.
   >
   > Kiểm tra lại bất cứ lúc nào: `gh variable list --env staging`.

Mở thử địa chỉ đó trên trình duyệt. Trước khi deploy site (bước 11) bạn sẽ thấy
trang lỗi 404 hoặc AccessDenied, vì bucket còn trống. Đó là bình thường.


### Bước 10. Apply prod

Giống hệt bước 9, thay `staging` bằng `prod`:

```bash
terraform -chdir=infra/envs/prod init -backend-config="bucket=$STATE_BUCKET"
terraform -chdir=infra/envs/prod plan -out=tfplan
```

✅ Kết quả đúng: khoảng 30 dòng `+` và **`0 to destroy`** (prod chưa có gì từ
trước). Plan của prod có thêm `aws_wafv2_web_acl` và alarm cho WAF. Không có bản
ghi DNS vì chưa có tên miền.

```bash
terraform -chdir=infra/envs/prod apply tfplan
```

Sau khi xong:

1. Xác nhận email SNS của prod.
2. Đặt toàn bộ biến của prod bằng một lệnh. Script tự dùng environment
   `production` (thư mục thì tên là `prod`):

   ```bash
   ./scripts/set-github-vars.sh prod
   ```

### Bước 11. Deploy site lần đầu và kiểm tra

**11.0 Điều kiện: code mới phải nằm trên `main`.** "Run workflow → main" chạy
file `deploy.yml` **đang có trên `main`**, không phải file ở nhánh của bạn. Nếu PR
`feat/infra-staging-prod` chưa merge, `main` vẫn giữ workflow cũ. Workflow cũ chỉ
chạy khi biến cấp repo `AWS_DEPLOY_ROLE_ARN` có giá trị, mà biến này không còn
dùng, nên job luôn bị **skipped** (đúng triệu chứng này).

Cách kiểm tra: mở PR, thấy trạng thái **Merged** là được.

Trước khi merge, đảm bảo nhánh đã có các commit mới nhất (`git status` sạch và
`git push`). Merge xong, GitHub tự chạy `Terraform` và `Deploy to AWS` trên push.
Cả hai đều dùng đúng các biến bạn đặt ở bước 8–10, và job `production` dừng chờ
bạn duyệt.

**11.1 Chạy deploy.** Nếu workflow đã tự chạy sau khi merge thì bỏ qua bước này.
Chưa thì vào **Actions → Deploy to AWS → Run workflow**, chọn `main`, để trống
`ref`.

1. Workflow build staging, deploy staging, rồi chạy `smoke.sh`.
2. Sau đó nó **dừng chờ duyệt**. Bấm **Review deployments → production →
   Approve**.
3. Workflow deploy prod và chạy `smoke.sh` lần nữa.

Ở lần chạy đầu, hai job build sẽ đọc `SITE_URL_STAGING` và `SITE_URL_PROD` (đã
đặt ở bước 9 và 10). Nếu workflow báo `SITE_URL_... is empty`, quay lại bước đó.

**11.2 Mở site.** Mở hai địa chỉ CloudFront (lệnh `terraform -chdir=infra/envs/<env> output -raw site_url`).
Staging và prod là hai địa chỉ **khác nhau**.

**11.3 Kiểm tra bằng agent.** Nhờ Claude chạy agent **deploy-verifier** cho
`staging`, rồi cho `prod`.

✅ Kết quả đúng: `VERDICT: HEALTHY`.

**11.4 Bật required status checks.** Quay lại ruleset của `main` (bước 3.3)
và thêm các check bắt buộc: `check`, `plan (staging)`, `plan (prod)`.

Xong. Từ đây mọi thay đổi đi qua PR, xem Phần C.

---

## Phần C — Vận hành hằng ngày

### Sửa hạ tầng

**Không chạy `apply` từ máy nữa.** Mọi thay đổi hạ tầng đi qua PR:

1. Sửa file trong `infra/` (có thể nhờ agent `terraform-engineer`).
2. Nhờ agent `infra-security-auditor` review.
3. Mở PR. CI chạy `check` và `plan`, rồi đăng plan (đã che account ID) vào PR.
   Đọc kỹ theo [Phần A](#đọc-kết-quả-plan).
4. Merge. CI chạy `apply-staging` và `plan-prod` cùng lúc.
5. Mở job `plan-prod`, đọc plan trong **Summary**, rồi **Approve**
   `production`.
6. CI chạy `apply-prod`.

**Đừng gộp sửa hạ tầng và sửa site vào cùng một PR.** Nếu site cần hạ tầng mới
thì merge PR hạ tầng trước.

### Deploy site

Merge vào `main` bất kỳ thay đổi nào ngoài `infra/` là đủ. Luồng chạy:

1. build và deploy staging, kèm smoke test;
2. chờ bạn duyệt;
3. deploy prod, kèm smoke test.

### Rollback

Vào **Actions → Deploy to AWS → Run workflow** trên `main`, đặt `ref` bằng SHA
của commit tốt gần nhất. SHA lấy từ `git log --oneline` hoặc trang Commits.

- Commit đó **phải nằm trên `main`**. Nếu không, workflow từ chối.
- Workflow vẫn đi qua đủ các bước staging, duyệt, rồi prod.

**Khẩn cấp hơn:** bucket có bật versioning (giữ bản cũ 30 ngày). Khôi phục
object trên S3 console, rồi chạy:

```bash
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

### Khi có alarm

Email gửi từ topic `maeven-<env>-alerts`. Trước hết nhờ Claude chạy
**deploy-verifier** cho env đó, rồi xử lý theo bảng:

| Alarm | Thường do | Làm gì |
|---|---|---|
| `5xxErrorRate > 1%` | lỗi origin S3, quyền OAC | Xem lần deploy gần nhất. Nếu cần, rollback. |
| `4xxErrorRate > 15%` | link hỏng sau deploy, hoặc bot quét | Xem access log trong bucket `maeven-<env>-logs-*` để biết path nào bị 404. |
| WAF `BlockedRequests` | bị tấn công, hoặc chặn nhầm người thật | Xem sampled requests. Nếu chặn nhầm, đặt `waf_block_mode = false` qua PR. |

### WAF: từ Count sang Block

Trong 7 ngày đầu, WAF của prod chỉ **đếm**, chưa **chặn**. Sau 7 ngày:

1. Nhờ deploy-verifier viết phần "ready to block?".
2. Nếu ổn, mở PR đổi `waf_block_mode = true` trong `infra/envs/prod/terraform.tfvars`.

### Agent hỗ trợ (`.claude/agents/`)

| Agent | Vai trò |
|---|---|
| `terraform-engineer` | Sửa `infra/**` theo DESIGN.md. Không bao giờ apply. |
| `cicd-engineer` | Sửa workflow, `deploy.sh` và `smoke.sh`. |
| `infra-security-auditor` | Review bảo mật và chi phí, trước mỗi lần apply. |
| `deploy-verifier` | Kiểm tra site đang chạy sau deploy, sau rollback, hoặc khi có alarm. |

### Gỡ bỏ toàn bộ

Cẩn thận: các bước này không hoàn tác được.

1. Vào S3 console, **Empty** bucket site và bucket logs của từng env. Bucket
   site có versioning, nên phải xoá hết mọi phiên bản.
2. Gỡ prod rồi tới staging:
   - `terraform -chdir=infra/envs/prod destroy`
   - `terraform -chdir=infra/envs/staging destroy`
3. Bootstrap có `prevent_destroy` trên bucket state, zone và OIDC provider để
   chống xoá nhầm. Muốn gỡ phải sửa code một cách có chủ đích.

---

## Phần D — Lỗi thường gặp

| Thông báo lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `No valid credential sources found` | AWS CLI chưa đăng nhập | `aws configure`, rồi `aws sts get-caller-identity` |
| `Backend initialization required` hoặc `Inconsistent dependency lock file` | chưa `init`, hoặc vừa đổi backend | Chạy lại lệnh `init` của root đó, kèm `-backend-config="bucket=..."` với envs |
| `No value for required variable "alert_email"` | quên `export TF_VAR_alert_email` (terminal mới) | `export` lại như bước 5.1 |
| `Error acquiring the state lock` | một lệnh Terraform khác (máy khác hoặc CI) đang chạy cùng root | Đợi nó xong. Chỉ khi **chắc chắn** không còn gì đang chạy mới dùng `terraform force-unlock <Lock ID>` |
| `AccessDenied` khi chạy tay | sai account hoặc sai profile | `aws sts get-caller-identity` |
| `AccessDenied` / `Not authorized to perform sts:AssumeRoleWithWebIdentity` trong CI | `sub` không khớp trust policy, hoặc biến role ARN sai | Xem lại bước 4.4 và các biến ở bước 8–10 |
| `apply` treo lâu ở `aws_acm_certificate_validation` | Đã đặt `domain_name` nhưng DNS chưa trỏ về Route 53 | Ctrl-C **một lần** (Terraform dừng an toàn), kiểm tra `dig NS <domain> +short`. Chưa có tên miền thì bỏ `domain_name` khỏi `terraform.tfvars` (xem bước 2). |
| `SITE_URL_STAGING is empty` (hoặc `_PROD`) trong workflow | chưa đặt biến cấp repo sau lần apply đầu | Bước 9.4 và 10: `gh variable set SITE_URL_STAGING ...` |
| `SITE_URL ... does not match` trong job deploy | biến cấp repo và biến của environment khác nhau | Đặt cả hai bằng cùng một giá trị `site_url` |
| `BucketAlreadyOwnedByYou` / `EntityAlreadyExists` | resource đã có nhưng không có trong state, thường do mất state | **Đừng xoá gì.** Hỏi Claude cách `import` |
| Plan có `-/+` (replace) mà bạn không muốn | thay đổi một thuộc tính bắt buộc tạo lại resource | Đừng apply. Hỏi lại người viết thay đổi |
| `Error: deleting ... prevent_destroy` | đang cố xoá resource được bảo vệ | Đúng như thiết kế. Xem lại vì sao plan muốn xoá nó |

## Phần E — Chuyển sang tên miền riêng

Làm khi đã mua tên miền. Vì Route 53 zone nằm trong bootstrap và có
`prevent_destroy`, **hãy nhờ Claude làm cùng**, đừng tự sửa.

**Hiện trạng:** bootstrap đã tạo zone cho `maeven.vn` (khoảng $0.5/tháng). Zone
này chưa dùng, và để nguyên cũng vô hại.

**Nếu tên miền thật chính là `maeven.vn`:** zone đã có sẵn, chỉ cần làm các
bước 1–4 dưới đây (bỏ qua việc tạo zone mới).

**Nếu là tên miền khác (ví dụ `maven.io.vn`):**

1. **Đổi zone trong bootstrap.** Đổi `domain_name` ở `infra/bootstrap`. Plan sẽ
   muốn **xoá** zone cũ và tạo zone mới. `prevent_destroy` sẽ chặn, và đó là
   chủ ý. Nhờ Claude gỡ `prevent_destroy` cho riêng lần này, apply, rồi đặt lại.
2. **Trỏ nameserver** ở nhà đăng ký về 4 nameserver của zone mới:
   `terraform -chdir=infra/bootstrap output name_servers`. Chờ tới khi
   `dig NS <domain> +short` ra đúng 4 dòng của Route 53 (vài giờ tới 48 giờ).
3. **Bật domain cho từng môi trường**, staging trước. Ví dụ với `maeven.vn`:

   ```hcl
   # infra/envs/staging/terraform.tfvars
   domain_name = "staging.maeven.vn"
   # infra/envs/prod/terraform.tfvars
   domain_name = "maeven.vn"
   include_www = true
   ```

   Đặt thêm `hosted_zone_name` nếu tên zone khác tên miền chính.
4. **Plan, đọc kỹ, apply.** Lần đầu có chứng chỉ ACM nên mất thêm vài phút. Bản
   ghi `A`/`AAAA` trỏ về CloudFront được tạo tự động.
5. **Cập nhật URL cho CI.** Đổi 4 biến sang tên miền mới:

   ```bash
   gh variable set SITE_URL_STAGING                         --body "https://staging.<domain>"
   gh variable set SITE_URL_PROD                            --body "https://<domain>"
   gh variable set SITE_URL                   --env staging    --body "https://staging.<domain>"
   gh variable set SITE_URL                   --env production --body "https://<domain>"
   ```

   Rồi chạy lại workflow **Deploy to AWS**. Site phải build lại, vì canonical URL
   được ghi cứng vào HTML lúc build.
6. **Kiểm tra** bằng agent `deploy-verifier`. Khi đã có `www`, smoke check 4
   (www → apex) tự bật lại cho prod.

**Việc cần nhớ:** `maeven-tf-apply` (role chạy trong CI) có quyền Route 53 và
ACM giới hạn theo zone của bootstrap. Đổi tên miền thì quyền này đi theo zone
mới, nhờ bootstrap tính ra. Hãy chạy `infra-security-auditor` sau thay đổi.

---

## Lưu ý kỹ thuật

- `images: { unoptimized: true }` là bắt buộc, vì bộ tối ưu ảnh của
  `next/image` cần server. Ảnh trong `public/img` đã được resize sẵn.
- Nếu sau này cần tính năng server (AI stylist `/api/*`), module đã chừa sẵn
  `extra_origins` và `ordered_behaviors` để gắn thêm một Lambda origin.
- Role do người tạo bằng tay **không được** đặt tên bắt đầu bằng `maeven-`. Tiền
  tố này dành riêng cho role do CI quản lý, xem `DESIGN.md` §5.
