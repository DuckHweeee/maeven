# MAEVEN Journal — Lộ trình thi công theo phase

*Dịch `maeven-journal-feature-spec.md` thành các phase thi công được trên **code hiện tại**, kèm agent phụ trách và cổng audit cho từng phase. Đọc spec để biết "làm gì"; đọc file này để biết "làm theo thứ tự nào, ai làm, và nghiệm thu bằng gì".*

---

## 0. Đối chiếu spec với thực tế

Spec ghi rõ ở mục 0: *"Giả định: hệ thống ecommerce/backend đã tồn tại (custom-built)"*. **Giả định đó không đúng với repo này.** Hiện trạng:

| Spec giả định có | Thực tế trong repo |
|---|---|
| Customer, Order, Auth | Không có |
| Product entity trong DB | Mảng `PRODUCTS` hard-code trong `src/lib/data.ts` |
| Article entity trong CMS | Mảng `ARTICLES` hard-code, không có `pillar`, không có liên kết sản phẩm |
| Event bus / analytics | Không có |
| Job scheduler | Không có |
| API layer | Không có thư mục `src/app/api` |

Toàn bộ site là Next.js tĩnh, 19 trang prerender, không server state. Giỏ hàng là `localStorage`, thanh toán chưa tồn tại.

**Hệ quả:** không thể chạy Phase 1 của spec theo đúng thứ tự spec viết. Module C/D/E/F đều cần auth + DB + scheduler. Phải tách lại theo *thứ có thể xây được*, không theo thứ tự module trong spec.

### Ba nhóm theo hạ tầng cần có

| Nhóm | Module | Cần gì |
|---|---|---|
| **Xây được ngay** | A (P0), G, H (cách A), I (P1) | Không cần gì thêm. Chỉ là kiểu dữ liệu + route tĩnh. |
| **Cần một điểm nhận event** | J (P0) | Một endpoint ghi log. Là thứ đầu tiên buộc site phải có server. |
| **Cần auth + DB + scheduler** | B, C, D, E, F | Quyết định hạ tầng. Đổi bản chất dự án từ tĩnh sang có server. |

Mục tiêu đã chốt là **portfolio/showcase**, nên Phase A→C là phần đáng làm; Phase D→E chỉ mở khi mục tiêu đổi sang thương mại thật.

---

## 1. Phase A — Cầu nối nội dung ⇄ sản phẩm

**Đây là phần giá trị nhất của spec mà không bị chặn bởi hạ tầng.** Module A (P0) và Module H (cách A) chính là "commercial bridge" mà mục 0 của spec gọi là vấn đề gốc: *"không có cơ chế kỹ thuật nào nối nội dung với sản phẩm"*.

### Việc

1. **Thêm `pillar` vào `Article`** — enum `style | education | culture | brand | product`.
   Giữ nguyên `rubric`. Hai trường phục vụ hai việc khác nhau: `rubric` là điều hướng cho người đọc (Grooming, Phối đồ…), `pillar` là phân loại phễu cho người vận hành. Đừng gộp.
2. **Thêm `relatedSkus: string[]`** vào `Article`, có thứ tự, trỏ tới `PRODUCTS[].sku`.
3. **Chiều ngược lại** — `Product` suy ra bài viết liên quan từ `ARTICLES`, không khai báo hai lần. Một nguồn sự thật.
4. **Block gợi ý** trên trang bài (sản phẩm nhắc trong bài) và trang sản phẩm (bài viết liên quan) — Module H cách A, gán tay, không engine.
5. **`repurposeStatus`** — Module G. Chỉ là checklist trạng thái theo kênh, không tự động hoá gì.
6. **Metadata theo bài** — Module A P0 đòi "SEO tốt (title, description, slug sạch)". Hiện `generateMetadata` mới có title + description; thiếu canonical, OG, JSON-LD.

### Agent

| Việc | Agent | Ghi chú |
|---|---|---|
| Sửa kiểu dữ liệu + migrate `data.ts` | **content-model** *(chưa tồn tại — xem mục 5)* | Không agent nào đang sở hữu cấu trúc `data.ts` |
| Block gợi ý, trang bài, trang sản phẩm | **frontend-doctor** | Dựng UI rồi tự verify bằng tsc/eslint/build |
| Ảnh cho block mới nếu cần | **photo-scout** | |
| JSON-LD | `/blog-schema` (skill) | `BlogPosting` + `Product` + `BreadcrumbList` |

### Cổng audit — phải qua hết mới đóng phase

| Agent | Nghiệm thu |
|---|---|
| **preflight** | Mọi route 200, ảnh 200, 0 lỗi console/hydration, 3 chế độ motion sạch, không tràn ngang 390px |
| **blog-seo** | Metadata, heading, alt, canonical, OG, sitemap trên build output thật |
| **design-system-guard** | Block gợi ý dùng token, không màu/khoảng cách hard-code |
| **a11y-auditor** | Block gợi ý có ngữ nghĩa đúng, bàn phím tới được |
| **blog-reviewer** | Copy của block không mang giọng bán hàng — brand tự tuyên bố "không nhận bài tài trợ" |

### Ràng buộc toàn vẹn cần test

- Mọi `relatedSkus` trỏ tới sku có thật. Sku sai phải làm build đỏ, không được im lặng.
- Mọi `pillar` nằm trong enum.
- Xoá một sản phẩm mà còn bài trỏ tới → build đỏ.

**Không bị chặn bởi open question nào.** Spec mục 13 #4 (gán tay vs engine) đã tự trả lời: cách A là khuyến nghị P0.

---

## 2. Phase B — Bộ sưu tập biên tập

Module I (P1). Vẫn tĩnh hoàn toàn.

### Việc

- `Collection { id, name, launchDate, articleSlugs[], skus[] }` trong `data.ts`.
- Route `/collection/[id]` — timeline các bài theo thứ tự đếm ngược tới `launchDate`.
- CTA "Shop Now" chỉ hiện sau `launchDate` — so sánh ngày ở **build time**, không ở client, để không tạo hydration mismatch.

### Agent

| Việc | Agent |
|---|---|
| Kiểu dữ liệu `Collection` | **content-model** |
| Route + timeline | **frontend-doctor** |
| Bài cho chuỗi, nếu thiếu | **magazine-writer** |
| Chuyển cảnh timeline | **motion-3d** |

### Cổng audit

**preflight** (route mới + ảnh), **responsive-auditor**, **a11y-auditor** (timeline phải đọc được bằng bàn phím), **blog-seo** (route mới cần vào sitemap).

**Cảnh báo kỹ thuật:** so ngày ở client là nguồn hydration mismatch kinh điển. Site này đã dính một lần vì lý do tương tự (`.reveal` ẩn nội dung khi không có JS). Quyết định ở build time, hoặc chấp nhận trang phải render động.

---

## 3. Phase C — Đo lường

Module J (P0). **Đây là ranh giới: phase đầu tiên buộc phải có server.**

Spec mục 11 nói đúng và cần nhắc lại: *"tracking thiếu từ đầu thì không thể truy hồi dữ liệu lịch sử sau này"*. Nhưng chỉ đúng khi có người thật truy cập. Với portfolio chưa có traffic, làm Phase C sớm là chi phí không đổi lại gì.

### Quyết định trước khi code

Chọn một trong ba, không trộn:
1. **Không làm** — chấp nhận, và ghi rõ trong README là chủ ý.
2. **Endpoint tối giản** — một route handler ghi vào bảng `events`. Là lần đầu repo có server state.
3. **Dịch vụ ngoài** — không tự dựng store, nhưng ràng buộc quyền riêng tư (open question #3).

### Sự kiện tối thiểu (từ spec mục 11)

`article_viewed`, `article_product_click`, `article_saved`, `signup_completed`, `points_earned`/`points_redeemed`, `tier_changed`, `journey_step_sent`, `review_submitted`.

Ở phase này chỉ **hai cái đầu** có nghĩa — phần còn lại phụ thuộc module chưa tồn tại. Đừng khai báo event cho thứ chưa có.

### Agent

Chưa có agent nào phù hợp. Cần **analytics-instrumenter** hoặc để **frontend-doctor** làm kèm hướng dẫn cụ thể.

### Cổng audit

**preflight** (endpoint không làm vỡ prerender, không lỗi console), **a11y-auditor** (tracking không được chèn thuộc tính phá ngữ nghĩa), và một test riêng: **tắt JS thì trang vẫn dùng được**.

---

## 4. Phase D và E — Chỉ mở khi đổi mục tiêu

Module B, C, D, E, F. Cần auth + DB + job scheduler — tức là đổi dự án từ tĩnh sang có server thật.

**Bị chặn bởi open question chưa ai trả lời** (spec mục 13):

| # | Câu hỏi | Chặn module | Ai quyết |
|---|---|---|---|
| 1 | Kênh CRM chính | D | Business |
| 2 | Ngưỡng tier PRIVÉ / ICON | C | Business |
| 3 | Đồng ý thu thập hành vi đọc | B, J | Legal |
| 5 | QR theo customer hay order | E | Product + vận hành |
| 6 | Journey nhiều đơn chồng nhau | D | Product |

Không viết agent cho phase này cho tới khi chốt stack — một agent mô tả công việc trên hạ tầng chưa tồn tại sẽ đoán, và đoán có thẩm quyền là kiểu sai tệ nhất.

Nếu mở Phase D, đọc lại spec mục 14: **mọi cron trong Module D bắt buộc idempotent**, và **instrument event trong cùng PR với tính năng**, không để "làm sau".

---

## 5. Agent còn thiếu

Bộ 10 agent hiện có không phủ hết roadmap này.

### Cần viết: `content-model`

Không agent nào đang sở hữu **cấu trúc** của `src/lib/data.ts`. `magazine-writer` viết nội dung *vào* đó nhưng không đổi schema. Phase A và B đều bắt đầu bằng việc đổi kiểu dữ liệu.

Phạm vi đề xuất:
- Sửa `type` trong `data.ts` và migrate toàn bộ bản ghi hiện có cùng lúc — không để lẫn bản ghi cũ và mới.
- Giữ toàn vẹn tham chiếu: `relatedSkus` → sku có thật, `articleSlugs` → slug có thật, `pillar` trong enum. Sai phải làm **build đỏ**, không phải cảnh báo runtime.
- Cập nhật `magazine-writer` và `photo-scout` khi schema đổi, để chúng không ghi ra bản ghi thiếu trường.
- Đổi tên/cấu trúc route thì phải rà cả `scripts/shoot.mjs` và `.claude/agents/*` — bài học từ lần đổi `mv-sm-01` → `mv-01`.

### Cân nhắc sau: `analytics-instrumenter`

Chỉ viết khi đã chốt Phase C đi hướng nào. Trước đó không có gì để mô tả.

---

## 6. Nguyên tắc chung cho mọi phase

1. **Một phase không đóng cho tới khi qua hết cổng audit của nó.** Audit không phải việc làm cuối cùng nếu còn thời gian.
2. **`preflight` chạy ở mọi phase.** Nó là agent duy nhất thực sự chạy site; các agent khác chỉ đọc file.
3. **Đổi schema và đổi UI phải là hai PR.** Một PR đổi kiểu dữ liệu + migrate, một PR dựng giao diện. Gộp lại thì không review được.
4. **Không xây module sau khi module trước chưa qua audit** — spec mục 14 nói đúng: schema của module sau phụ thuộc dữ liệu của module trước.
5. **Mọi tính năng mới phải qua bài kiểm tra không-JS.** Repo này đã ship một lần lỗi ẩn nội dung với người không chạy JS; cổng đó giờ nằm trong `preflight`.
