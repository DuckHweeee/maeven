# MAEVEN — Kế hoạch AI Stylist & Virtual Try-On

*Kế hoạch đưa hai tính năng AI vào site hiện tại: **AI Stylist** (tư vấn phối đồ + chọn size) và **Virtual Try-On** (thử đồ trên ảnh). Viết dựa trên code đang có, theo cùng cách chia phase và cổng nghiệm thu với `maeven-journal-roadmap.md`.*

> **Cập nhật 01.10.2026: chốt hướng minimalist cho Try-On.** Chỉ làm **Phase 4a**: ảnh try-on tạo sẵn một lần bằng dịch vụ có license thương mại (ví dụ web tool của WeShop), phục vụ tĩnh, không cần backend riêng cho try-on. **Bỏ Phase 4b**, không nhận ảnh của khách. Không gọi Space demo trên Hugging Face từ site, vì đó là bản dùng thử, không phải API. Phần học về model mã nguồn mở nằm trong [`research/`](research/README.md).

---

## 0. Hiện trạng và hệ quả

| Cần cho tính năng AI | Thực tế trong repo |
|---|---|
| Server giữ API key, gọi model | Không có. `next.config.ts` đặt `output: "export"` — site là file tĩnh trên S3 + CloudFront |
| Dữ liệu sản phẩm có thuộc tính để AI suy luận (màu, form, loại, bảng size) | `PRODUCTS` trong `src/lib/data.ts` chỉ có tên, giá, chất liệu, mô tả, specs dạng text |
| Ảnh sản phẩm thật, nền sạch, để ghép lên người | `public/img/product/*` là ảnh stock Pexels/Unsplash, **không phải áo thật của MAEVEN** |
| Giỏ hàng | Có — `src/lib/cart.ts`, `addToCart(sku, size)` dùng lại được ngay |
| Ngôn ngữ thương hiệu | `maeven-brand-voice-style-guide.md`: nói bằng lý do, có số liệu, không hô hào trend |

**Ba hệ quả:**

1. **Phải có một backend nhỏ.** API key không bao giờ được nằm trong bundle trình duyệt. Đề xuất: AWS Lambda đặt sau chính CloudFront hiện có, ở đường dẫn `/api/*`. Phần còn lại của site vẫn tĩnh như cũ.
2. **Phải làm giàu dữ liệu sản phẩm trước.** AI chỉ tư vấn tốt bằng dữ liệu nó có. Hiện chưa có màu, dáng, nhóm món, số đo theo size.
3. **Virtual Try-On cần ảnh sản phẩm thật.** Ghép ảnh stock lên người khách sẽ cho ra một chiếc áo không tồn tại — tức là lừa khách. Đây là điều kiện chặn của Phase 4.

---

## 1. Hai tính năng, định nghĩa cho đúng giọng MAEVEN

### AI Stylist — "người bạn biết rõ mười bốn mẫu"

Không phải chatbot bán hàng. Là người trả lời ba câu hỏi khách thật sự có:

- **"Mặc với gì?"** — phối outfit từ các mẫu MAEVEN, mỗi gợi ý kèm *lý do* (vải, độ dày, dịp mặc), không dùng tính từ rỗng.
- **"Size nào?"** — từ chiều cao, cân nặng, số đo, thói quen mặc rộng/vừa → size cụ thể + giải thích bằng số (vòng ngực áo size M là bao nhiêu cm).
- **"Phối với đồ mình đã có"** — khách chụp một món trong tủ, stylist gợi ý mẫu MAEVEN đi cùng. Khớp đúng định vị "tủ đồ ít món nhưng linh hoạt".

Kết quả luôn là **thẻ outfit có nút thêm vào giỏ** và có thể kèm **một bài Tạp chí liên quan** — đây chính là cầu nối nội dung ⇄ sản phẩm mà roadmap Journal gọi là vấn đề gốc.

### Virtual Try-On — "xem trước, không phải ảnh quảng cáo"

Chia hai mức để ra mắt được sớm và an toàn:

- **4a. Thử trên người mẫu có sẵn** — mỗi sản phẩm được ghép sẵn lên 4–6 người mẫu với vóc dáng khác nhau (gầy/vừa/đậm, cao/thấp). Tạo offline, phục vụ tĩnh như ảnh thường. Không có ảnh khách, không tốn chi phí mỗi lượt xem.
- **4b. Thử trên ảnh của khách** — khách tải ảnh lên, hệ thống ghép áo lên ảnh đó. Có chi phí mỗi lượt và có rủi ro quyền riêng tư nên làm sau, kèm đồng ý rõ ràng và tự xoá ảnh.

Mọi ảnh try-on đều gắn nhãn *"Ảnh minh hoạ do AI tạo — màu và độ rủ có thể khác thực tế"*. Một review khách đã nói "màu ngoài đời nhạt hơn trên web" — đừng để AI khuếch đại sai lệch đó.

---

## 2. Kiến trúc

```
Trình duyệt ──▶ CloudFront ──┬─ /*      ─▶ S3 (site tĩnh, như hiện tại)
                             └─ /api/*  ─▶ Lambda Function URL (Node 22, response streaming)
                                              │
                                              ├─▶ Claude API (Stylist: chat, vision, tool use)
                                              ├─▶ Nhà cung cấp Try-On (4b)
                                              ├─▶ S3 "uploads" (ảnh khách, tự xoá sau 24h)
                                              └─▶ Secrets Manager / SSM (API key)
```

**Vì sao Lambda thay vì bỏ static export:** giữ nguyên pipeline deploy đã chạy (`infra/`, `scripts/deploy.sh`, GitHub Actions), thêm hạ tầng bằng Terraform cùng chỗ. Cùng domain nên không cần CORS.
*Phương án khác:* bỏ `output: "export"`, chuyển sang Vercel/Amplify và viết Route Handler trong `src/app/api/`. Code gọn hơn nhưng phải bỏ toàn bộ hạ tầng S3/CloudFront đang có. Chỉ nên chọn nếu dự định có thêm nhiều tính năng server (auth, đơn hàng).

### Thư mục mới

```
api/                         Code Lambda (TypeScript, bundle bằng esbuild)
  stylist/handler.ts         POST /api/stylist — streaming chat
  stylist/tools.ts           search_products, get_size_chart, find_articles
  stylist/prompt.ts          system prompt (cố định để cache được)
  tryon/handler.ts           POST /api/tryon, GET /api/tryon/:id (4b)
  upload/handler.ts          cấp presigned URL lên S3 uploads (4b)
  shared/catalog.ts          import từ src/lib/data.ts — một nguồn sự thật
infra/api.tf                 Lambda, Function URL + OAC, behavior /api/* trên CloudFront
infra/uploads.tf             Bucket ảnh khách, lifecycle xoá 1 ngày
src/app/stylist/page.tsx     Trang Stylist (client component, tĩnh)
src/components/stylist/      ChatPanel, OutfitCard, SizeAdvice, PhotoInput
src/components/tryon/        TryOnViewer, BodyTypePicker, UploadConsent
src/lib/api.ts               fetch + đọc stream; base URL lấy từ env khi dev
```

---

## 3. Lựa chọn model AI

### Stylist — Claude API (`@anthropic-ai/sdk`)

| Hạng mục | Đề xuất |
|---|---|
| Model | `claude-opus-5-5` (mặc định, $4 / $20 mỗi 1 triệu token vào/ra) với `effort: "low"` cho chat. Nếu muốn rẻ hơn, có thể chọn `claude-sonnet-5-5` ($2 / $10) hoặc `claude-haiku-4-5` ($1 / $5) — đó là quyết định của bạn, nên đo chất lượng trên bộ câu hỏi mẫu trước khi hạ |
| Tool use | `search_products`, `get_size_chart`, `find_articles` — `strict: true` để input luôn đúng schema |
| Structured output | Thẻ outfit trả về dạng JSON (`output_config.format`) → render thành `OutfitCard`, không parse text |
| Vision | Ảnh món đồ khách chụp ("phối với đồ mình đã có") gửi kèm dạng base64 |
| Prompt caching | System prompt + catalog + giọng thương hiệu là phần cố định → cache, lượt sau chỉ trả ~1/10 giá phần đó |
| Streaming | Bật — câu trả lời hiện dần, Lambda dùng response streaming |
| Refusal | Kiểm tra `stop_reason === "refusal"` trước khi đọc nội dung; bật `fallbacks` phía server |

**Ước tính chi phí (cần đo lại thực tế):** một lượt chat ≈ 6.000 token vào (phần lớn được cache) + ~500 token ra → khoảng 1–2 cent với Opus 5.5 ở effort thấp. Một phiên 5–6 lượt ≈ 5–10 cent.

### Try-On — model chuyên dụng (Claude không tạo ảnh)

Virtual try-on cần model sinh ảnh chuyên cho quần áo. Các hướng cần đánh giá:

- **API thương mại chuyên VTON** (ví dụ FASHN và các dịch vụ tương tự) — chất lượng tốt nhất, tính phí theo ảnh, không phải vận hành GPU.
- **Virtual Try-On trên Google Cloud Vertex AI** — phù hợp nếu sẵn sàng dùng thêm GCP.
- **Model mã nguồn mở (họ IDM-VTON, chạy qua Replicate hoặc GPU tự thuê)** — rẻ khi lưu lượng lớn, nhưng phải tự lo chất lượng và giấy phép thương mại.

Model mã nguồn mở đã xem xét: CatVTON, IDM-VTON, OOTDiffusion, FitDiT đều là CC BY-NC-SA 4.0, không dùng thương mại được. Code Leffa là MIT nhưng dữ liệu train là phi thương mại. Các model này chỉ dùng để học, xem [`research/`](research/README.md).

Cách chọn: chạy cùng **4 sản phẩm × 6 ảnh người** qua từng nhà cung cấp, chấm theo độ đúng màu, độ rủ của lanh, giữ nguyên khuôn mặt, độ trễ, giá mỗi ảnh và điều khoản lưu trữ dữ liệu. Đặt mọi nhà cung cấp sau một interface `TryOnProvider` để đổi được sau này.

---

## 4. Các phase

### Phase 0 — Nền dữ liệu *(không cần backend, làm ngay được)*

Mở rộng kiểu `Product` trong `src/lib/data.ts`:

```ts
style: {
  category: "top" | "bottom" | "outer";
  layer: "base" | "mid" | "outer";
  colors: { name: string; hex: string }[];
  fit: "slim" | "regular" | "relaxed";
  weightGsm: number;            // đã có trong text specs, tách ra thành số
  occasions: string[];          // "đi làm", "cuối tuần", "đám cưới"…
  seasons: ("nóng" | "mát")[];
};
sizeChart: Record<Size, { chest?: number; waist?: number; length: number; shoulder?: number }>; // cm
tryOn?: { garmentImage: string; garmentType: "upper" | "lower" | "outer" };
```

Thêm vào `Article` trường `relatedSkus` (trùng Phase A của roadmap Journal — làm một lần cho cả hai).

| Việc | Agent |
|---|---|
| Thêm trường + điền cho cả 4 sản phẩm | **content-model** |
| Chụp ảnh sản phẩm thật nền trơn cho try-on | Việc của người — agent không làm được |

**Cổng:** `npm run build` qua; mọi SKU có đủ `style` và `sizeChart`; không còn số đo nằm trong text tự do.

### Phase 1 — Khung backend

1. `infra/api.tf`: Lambda Node 22, Function URL có OAC, behavior `/api/*` trên CloudFront (không cache, chuyển tiếp body POST).
2. API key Anthropic trong Secrets Manager; Lambda đọc lúc khởi động.
3. **Chống lạm dụng** (site không có đăng nhập, ai cũng gọi được): rule rate-limit của AWS WAF theo IP, giới hạn kích thước request, Cloudflare Turnstile cho Try-On 4b, và AWS Budgets cảnh báo khi chi phí vượt ngưỡng.
4. Log có cấu trúc (không ghi ảnh, không ghi số đo cơ thể) vào CloudWatch.
5. Khi dev: `NEXT_PUBLIC_API_BASE` trỏ tới Lambda chạy local hoặc stage dev.

**Cổng:** `curl -X POST /api/health` qua CloudFront trả 200; IP gọi quá ngưỡng bị chặn 429; `terraform plan` sạch.

### Phase 2 — AI Stylist MVP (chỉ chat chữ)

1. `api/stylist`: tool runner với 3 tool; **server kiểm tra lại mọi SKU** model trả về so với `PRODUCTS` — không bao giờ hiển thị sản phẩm không có thật.
2. System prompt dựng từ `maeven-brand-voice-style-guide.md`: câu dưới 22 chữ, số thay tính từ, không thúc ép mua, nói thật khi MAEVEN không có món phù hợp.
3. Trang `/stylist`: vài câu hỏi khởi động (dịp mặc, khí hậu, phong cách) → chat → thẻ outfit → `addToCart`.
4. Điểm vào: nút "Mặc với gì?" trong `BuyPanel.tsx`, mở stylist với sản phẩm đang xem làm ngữ cảnh. Thêm "Stylist" vào `NAV`.
5. Lịch sử chat chỉ lưu `sessionStorage` của khách, không lưu phía server.

**Cổng:** bộ 30 câu hỏi mẫu (tiếng Việt, gồm cả câu bẫy như "có quần jean không?") — 0 SKU bịa, 100% gợi ý có lý do, **blog-reviewer** chấm giọng văn; **a11y-auditor** và **responsive-auditor** qua cho trang `/stylist`.

### Phase 3 — Tư vấn size + "phối với đồ mình đã có"

1. **Size:** tính *bằng code* từ `sizeChart` + số đo khách (có quy tắc rõ ràng, kiểm thử được); Claude chỉ giải thích kết quả bằng lời. Không để model tự đoán size.
2. **Vision:** khách chụp một món trong tủ → Claude mô tả (loại, màu, chất liệu ước đoán) → gợi ý mẫu MAEVEN đi cùng. Ảnh xử lý trong request rồi bỏ, không lưu.
3. Hiển thị size gợi ý ngay trong bộ chọn size của `BuyPanel`.

**Cổng:** unit test cho hàm chọn size (biên giữa hai size, số đo thiếu); 10 ảnh thử nghiệm cho ra mô tả đúng loại món.

### Phase 4a — Try-On trên người mẫu có sẵn *(hướng đã chốt)*

1. Chọn nhà cung cấp theo bài đánh giá ở mục 3. Bản minimalist: tạo tay trên web tool, không tích hợp API.
2. Mỗi sản phẩm × 3–4 người mẫu (ảnh có license, đa dạng vóc dáng) → `public/img/tryon/`, commit như ảnh thường. Chỉ viết script `scripts/generate-tryon.mjs` khi nhà cung cấp có API trong gói đã mua.
3. `TryOnViewer` trên trang sản phẩm: chọn vóc dáng gần mình nhất → xem áo trên người đó; dùng lại các component motion có sẵn.
4. **photo-scout** chọn ảnh người mẫu; credits cập nhật trên `/credits`.

**Cổng:** **preflight** qua mọi route; ảnh try-on có nhãn "do AI tạo"; người duyệt so màu với sản phẩm thật.

### Phase 4b — Try-On trên ảnh của khách *(đã bỏ theo hướng minimalist, giữ lại để tham khảo)*

1. Màn hình đồng ý: ảnh dùng để làm gì, gửi cho bên thứ ba nào, **xoá sau 24 giờ**. Không tick đồng ý thì không tải lên được.
2. Tải lên bằng presigned URL vào bucket riêng (mã hoá, lifecycle 1 ngày, không public).
3. Job bất đồng bộ: `POST /api/tryon` → trả `jobId` → client poll `GET /api/tryon/:id` → ảnh kết quả qua URL ký có hạn.
4. Từ chối ảnh không phù hợp (không có người, nhiều người, trẻ em) trước khi gửi đi.
5. Giới hạn: vài lượt mỗi phiên + Turnstile + WAF.
6. Cập nhật `/about-us` (đoạn vai trò của AI) và chính sách quyền riêng tư, tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân — ảnh khuôn mặt và cơ thể là dữ liệu nhạy cảm.

**Cổng:** **security-review** cho toàn bộ đường đi của upload; kiểm tra ảnh thực sự bị xoá sau 24h; chi phí mỗi lượt nằm trong ngân sách đã đặt.

### Phase 5 — Kết hợp

- Stylist gợi ý outfit → bấm "Thử cả bộ" → ghép áo + quần lên người mẫu hoặc ảnh khách.
- Đo hiệu quả: tỉ lệ thêm vào giỏ từ thẻ outfit, tỉ lệ đổi size (khi có đơn hàng thật), số phiên stylist.

---

## 5. Thứ tự và khối lượng ước tính

| Phase | Phụ thuộc | Ước lượng |
|---|---|---|
| 0. Nền dữ liệu | — | 1–2 ngày (+ thời gian chụp ảnh sản phẩm) |
| 1. Khung backend | — (song song với 0) | 2–3 ngày |
| 2. Stylist MVP | 0, 1 | 4–5 ngày |
| 3. Size + vision | 2 | 2–3 ngày |
| 4a. Try-on người mẫu | 0 (ảnh thật), chọn nhà cung cấp | 3–4 ngày |
| 4b. Try-on ảnh khách | 1, 4a | 4–5 ngày |
| 5. Kết hợp | 3, 4b | 2–3 ngày |

Đường nhanh nhất để có thứ chạy được: **0 → 1 → 2**. Phase 4a có thể đi song song ngay khi có ảnh sản phẩm thật.

---

## 6. Quyết định cần bạn chốt

1. **Hạ tầng backend:** Lambda sau CloudFront (giữ hạ tầng hiện tại) hay chuyển sang Vercel/Amplify?
2. **Model cho Stylist:** Opus 5.5 effort thấp (đề xuất), hay Sonnet 5.5 / Haiku 4.5 để rẻ hơn?
3. **Nhà cung cấp Try-On:** chạy bài đánh giá ở mục 3 rồi chọn, hay đã có lựa chọn sẵn?
4. **Ảnh sản phẩm thật:** khi nào có? Phase 4 bị chặn cho tới lúc đó.
5. **Mục tiêu dự án:** roadmap Journal ghi đây là portfolio/showcase. Nếu vẫn vậy, có thể dừng ở 4a (không lưu ảnh khách, chi phí gần như cố định) và chỉ làm 4b khi chuyển sang bán thật.
