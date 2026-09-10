# MAEVEN Journal System — Feature Specification (Engineering Handoff)

*Nguồn: `maeven-journal-content-retention-strategy.md`. Tài liệu này dịch chiến lược đó thành các module tính năng cụ thể, có data model và tiêu chí chấp nhận, để đội phát triển (bao gồm Claude Code) có thể bắt tay code trực tiếp vào hệ thống hiện có. Giả định: hệ thống ecommerce/backend đã tồn tại (custom-built) — spec này chỉ mô tả phần MỞ RỘNG cần thêm, không thiết kế lại từ đầu.*

---

## 0. Vấn đề & Mục tiêu hệ thống

**Vấn đề:** Journal hiện hoạt động tách rời khỏi ecommerce — không có cơ chế kỹ thuật nào nối nội dung với sản phẩm, không có dữ liệu để biết bài viết nào ảnh hưởng đến hành vi mua, và hành trình sau mua hàng hiện chỉ dựa vào discount thay vì nội dung/privilege. Hệ quả: khách mua một lần rồi biến mất, retention thấp, và team không có cách đo content nào thực sự tạo ra giá trị.

**Mục tiêu hệ thống (đo được):**

1. Mỗi bài Journal có thể gắn sản phẩm liên quan và mỗi sản phẩm có thể hiển thị bài Journal liên quan — không còn link thủ công rời rạc.
2. Toàn bộ vòng đời khách hàng sau mua (Day 0 → Day 30) chạy tự động theo trigger, không cần vận hành thủ công từng khách.
3. Có điểm thưởng + phân hạng loyalty thực sự vận hành được bằng số liệu (không xét tay).
4. Từ ngày đầu tiên, hệ thống ghi lại đủ sự kiện (views, click-through, saved article, signup source) để dựng KPI dashboard ở Phase 2 mà không cần refactor lại tracking.

**Giả định (cần xác nhận với team):** hệ thống hiện có đã có các entity Customer, Product, Order, Auth. Spec dưới đây coi đó là nền, chỉ liệt kê field/entity cần **thêm**.

**Non-goals (rõ ràng ngoài phạm vi giai đoạn này):**

- Không tự động sinh nội dung Instagram/TikTok/email bằng AI từ bài Journal — Phase 1–2 chỉ tracking trạng thái repurpose thủ công, generate là việc của người viết/design.
- Không xây dựng recommendation engine học máy — dùng rule-based trước, ML là cân nhắc tương lai (P2 kiến trúc, không code ngay).
- Không xây hệ thống ticketing/sự kiện offline đầy đủ cho hạng ICON — Phase 1–2 xử lý mời sự kiện thủ công qua email, chỉ cần đánh dấu khách đủ điều kiện.

---

## 1. Bản đồ module

```text
                     ┌─────────────────────┐
                     │   Journal CMS        │
                     │ (Article, Collection) │
                     └──────────┬───────────┘
                                │ article ⇄ product links
                    ┌───────────┴────────────┐
                    ▼                        ▼
          ┌──────────────────┐     ┌──────────────────┐
          │  Product Pages     │     │  Recommendation   │
          │ (existing, extend) │◄────┤  Blocks (rule-based)│
          └──────────────────┘     └──────────────────┘
                    │
                    ▼ order.completed event
          ┌──────────────────────────┐
          │  Post-Purchase Automation  │
          │  Engine (Day 0→30 triggers) │
          └──────────┬────────────────┘
                      │ writes
                      ▼
          ┌──────────────────────────┐        ┌────────────────────┐
          │  Loyalty & Points Ledger   │◄──────►│  "Your MAEVEN Journey"│
          │  (tiers, balance)          │        │  account page + QR   │
          └──────────────────────────┘        └────────────────────┘
                      │
                      ▼
          ┌──────────────────────────┐
          │  Analytics / Event Tracking │  (đo mọi module ở trên)
          └──────────────────────────┘
```

---

## 2. Module A — Journal CMS

**User stories:**
- Là content editor, tôi muốn tạo/sửa bài viết theo 1 trong 5 pillar (Style, Education, Culture, MAEVEN, Product) để phân loại nội dung đúng mục tiêu funnel.
- Là content editor, tôi muốn gắn danh sách sản phẩm liên quan (có thứ tự) vào một bài viết để tạo commercial bridge.
- Là content editor, tôi muốn xem trạng thái "đã repurpose sang kênh nào chưa" của một bài để biết việc nào còn tồn.
- Là khách truy cập, tôi muốn đọc bài viết có SEO tốt (title, description, slug sạch) để tìm được qua Google.

**Data model — `Article`**

| Field | Kiểu | Ghi chú |
|---|---|---|
| id, slug | string | slug unique, dùng cho URL |
| pillar | enum(style, education, culture, brand, product) | bắt buộc |
| title, body | string / rich text blocks | |
| hero_image | media ref | |
| read_time_minutes | int | tính tự động từ độ dài body hoặc nhập tay |
| status | enum(draft, published, scheduled) | |
| published_at | datetime | nullable nếu draft |
| seo_title, seo_description | string | fallback về title/excerpt nếu trống |
| related_product_ids | ordered array (FK Product) | hiển thị ở block "Build Your Wardrobe" / "Shop the Story" |
| collection_id | FK Collection, nullable | dùng cho editorial launch (Module F) |
| repurpose_status | object `{ig_carousel, reel, email, pinterest}` mỗi field enum(not_started, in_progress, done) | Module G |

**Requirements**

- **P0**: CRUD bài viết theo pillar; publish/draft/schedule; gắn related_product_ids có thứ tự; slug + SEO fields; sitemap.xml tự động include bài published.
- **P0**: Trang product (entity có sẵn) hiển thị block "Journal liên quan" — query ngược từ `Article.related_product_ids` chứa product đó (không cần field riêng trên Product, tránh đồng bộ 2 chiều).
- **P1**: `repurpose_status` hiển thị dạng checklist trong CMS, không có logic tự động — chỉ để team đánh dấu.
- **P2**: Auto-generate excerpt/social caption từ body bằng AI (không build ở giai đoạn này, chỉ chừa chỗ trong schema).

**Acceptance criteria (đăng bài + hiển thị link sản phẩm)**
- Given một bài Article có `related_product_ids = [teeId, trouserId]`, When khách xem bài, Then thấy block sản phẩm theo đúng thứ tự đã gắn, mỗi item link ra product page.
- Given một Product có 2 bài Article đang published trỏ tới nó, When khách xem product page, Then thấy tối đa N bài mới nhất (N cấu hình được) sắp theo `published_at` giảm dần.
- Given một Article ở trạng thái `draft`, When bất kỳ ai không phải editor truy cập URL bài đó, Then trả về 404 (không lộ nội dung chưa publish).

---

## 3. Module B — Bookmark / Saved Articles

**User stories:** Là khách đã đăng nhập, tôi muốn lưu bài viết để đọc sau và thấy lại trong trang tài khoản.

**Data model:** bảng nối `saved_articles (customer_id, article_id, saved_at)` — không thêm field vào Customer trực tiếp để tránh mảng không giới hạn.

**Requirements**
- **P0**: Nút Save trên bài viết (yêu cầu đăng nhập; nếu chưa đăng nhập → prompt login, giữ lại intent save sau khi login).
- **P0**: Danh sách bài đã lưu hiển thị trong "Your MAEVEN Journey" (Module E).
- **P1**: Unsave, và giới hạn hiển thị/phân trang nếu danh sách dài.

---

## 4. Module C — Loyalty & Points Ledger

**User stories:**
- Là khách hàng, tôi muốn thấy điểm hiện có và hạng thành viên của mình.
- Là hệ thống, tôi cần cộng/trừ điểm một cách có audit trail (không sửa trực tiếp `points_balance`).
- Là marketing, tôi muốn định nghĩa ngưỡng lên hạng bằng số liệu, không xét tay.

**Data model**

`Customer` (mở rộng entity hiện có):
| Field thêm | Kiểu |
|---|---|
| loyalty_tier | enum(member, prive, icon) |
| points_balance | int (denormalized cache — nguồn thật là ledger) |
| order_count, lifetime_spend | int / decimal — dùng để tính tier |

`PointsLedgerEntry` (bảng mới):
| Field | Kiểu | Ghi chú |
|---|---|---|
| id, customer_id | | |
| order_id | nullable FK | null với welcome/birthday points |
| points_delta | int | dương (earn) hoặc âm (redeem) |
| reason | enum(welcome, purchase, birthday, referral, redemption, manual_adjustment) | |
| created_at | datetime | |

**Ngưỡng tier — CẦN CHỐT (xem Open Questions #2).** Đề xuất mặc định để engineering có baseline code trước, business chỉnh sau qua config chứ không hard-code:
- MEMBER: mặc định khi tạo tài khoản.
- PRIVÉ: `order_count >= 2` HOẶC `lifetime_spend >= X` (X là config).
- ICON: `order_count >= 5` HOẶC `lifetime_spend >= Y` (Y là config), có thể invite-only thủ công song song.

**Requirements**
- **P0**: Ghi ledger entry mỗi khi có `order.completed` (earn points theo % giá trị đơn — tỉ lệ config được).
- **P0**: `points_balance` cập nhật đồng bộ (transaction) với ledger, không lệch.
- **P0**: Tính lại `loyalty_tier` sau mỗi đơn hàng hoàn tất, dựa trên ngưỡng config.
- **P1**: Trang admin xem/điều chỉnh ledger thủ công (manual_adjustment) có lý do bắt buộc, phục vụ CSKH.
- **P1**: Birthday reward job (cron hàng ngày quét customer có birthday = hôm nay, cộng điểm + gửi thông điệp).
- **P2**: Cho phép khách đổi điểm lấy reward cụ thể (redemption catalog) — chưa cần nếu Phase 1 chỉ hiển thị điểm.

**Acceptance criteria**
- Given khách có `order_count = 1`, When họ hoàn tất đơn thứ 2, Then `loyalty_tier` chuyển từ `member` sang `prive` ngay sau khi order status = completed, và có 1 ledger entry mới ghi điểm của đơn đó.
- Given một ledger entry được tạo, When cộng tất cả `points_delta` của customer đó, Then tổng phải khớp chính xác `points_balance` (invariant cần test tự động).

---

## 5. Module D — Post-Purchase Automation Engine

Đây là phần phức tạp nhất về kỹ thuật — cần một job scheduler/event system, không phải chỉ CRUD.

**User stories:**
- Là khách vừa mua hàng, tôi nhận đúng thông điệp đúng thời điểm (Day 0/1-3/7/10-14/21/30) mà không bị trùng hoặc gửi nhầm thứ tự.
- Là marketing, tôi muốn dừng/điều chỉnh một bước trong journey nếu khách đã có hành động khác (VD: đã mua lần 2 trước Day 21 thì không cần bước upsell Day 21 nữa).

**Data model**

`Order` (mở rộng): thêm object `journey_status`:
```
journey_status: {
  day0_welcome_sent_at: datetime | null,
  day3_delivery_sent_at: datetime | null,
  day7_review_requested_at: datetime | null,
  day7_review_completed_at: datetime | null,
  day14_style_content_sent_at: datetime | null,
  day21_upsell_sent_at: datetime | null,
  day30_reward_sent_at: datetime | null
}
```
Lưu trạng thái theo **order**, không theo customer — vì một khách có thể có nhiều đơn chạy journey song song; cần rule ưu tiên đơn nào (đề xuất: chỉ đơn mới nhất chưa hoàn tất journey được chạy, các đơn cũ hơn bị auto-cancel journey nếu có đơn mới hơn xen vào, để tránh spam).

**Requirements**
- **P0**: Job chạy định kỳ (VD: mỗi giờ) quét các đơn `completed` cần gửi bước tiếp theo dựa vào `completed_at + offset`, gửi, ghi timestamp vào `journey_status`. Idempotent — chạy lại không gửi trùng (check timestamp đã set chưa trước khi gửi).
- **P0**: Kênh gửi — **cần chốt trước khi code** (xem Open Questions #1). Thiết kế interface gửi (`NotificationSender.send(customer, template, payload)`) độc lập kênh để đổi provider sau này không phải sửa logic trigger.
- **P0**: Điều kiện dừng Day 21 upsell nếu `order_count` của customer đã tăng thêm kể từ đơn gốc (tức đã mua lần 2 rồi thì khỏi nhắc).
- **P1**: Day 7 gắn với Module F (review request) — nếu khách đã review trước khi job chạy, đổi nội dung gửi (bỏ qua nhắc review, đi thẳng "Complete the look").
- **P1**: Admin xem được trạng thái journey của từng đơn (debug/CSKH).
- **P2 (từ nhận xét ở bản chiến lược)**: Nhánh win-back Day 45–60 nếu không có đơn thứ 2 — chưa build Phase 1–2 nhưng `journey_status` nên để mở rộng thêm field sau này mà không phải migrate lại toàn bộ.

**Acceptance criteria**
- Given một đơn `completed` lúc T, When job chạy tại thời điểm T + 3 ngày, Then `day3_delivery_sent_at` được set và message gửi đúng 1 lần — chạy job thêm lần nữa trong cùng ngày không gửi lại.
- Given customer đã có đơn thứ 2 trước ngày 21 của đơn thứ nhất, When job xét bước Day 21 của đơn thứ nhất, Then bỏ qua gửi upsell (đánh dấu `day21_upsell_sent_at = skipped`, không phải null, để phân biệt "chưa tới lượt" và "đã chủ động bỏ qua").

---

## 6. Module E — "Your MAEVEN Journey" (trang tài khoản + QR)

**User stories:** Là khách, tôi quét QR trên bao bì và thấy ngay tổng quan tài khoản của mình mà không cần đăng nhập lại nhiều bước.

**Requirements**
- **P0**: Trang tài khoản hiển thị: member since (created_at), tổng số đơn, points_balance, loyalty_tier, "next reward" (khoảng cách tới ngưỡng tier tiếp theo hoặc điểm cần để đổi), danh sách saved articles (Module B).
- **P0**: QR code sinh theo từng đơn hàng (hoặc theo customer, cần quyết định — đề xuất theo **customer**, in hàng loạt đơn giản hơn theo đơn), encode URL có token xác thực nhẹ để auto-login hoặc chuyển thẳng trang login nếu token hết hạn.
- **P1**: "Next reward" hiển thị dạng progress bar (VD: "còn 2 đơn nữa để lên PRIVÉ").

---

## 7. Module F — Review / Product Experience (Day 7)

**Data model:** `Review { id, customer_id, order_id, product_id, rating, text, photos[], created_at }`

**Requirements**
- **P0**: Form review đơn giản (rating + text) gắn với order_id + product_id cụ thể (không review chung chung).
- **P0**: Sau khi submit review → hiển thị block "Complete the look" (Module H, rule-based).
- **P1**: Review hiển thị công khai trên product page (kèm kiểm duyệt trạng thái approved/pending).

---

## 8. Module G — Content Repurposing Tracking

Đã mô tả field `repurpose_status` trong Module A. Đây không phải hệ thống tự động — chỉ là checklist trạng thái trong CMS để nhóm content không quên các kênh. Không cần entity riêng.

- **P1**: Filter trong CMS: "bài published > 7 ngày nhưng repurpose_status còn not_started" → cảnh báo cho content team.

---

## 9. Module H — Recommendation Blocks (rule-based)

**Quan trọng: cần chốt trước khi code (Open Questions #4)** — có 2 cách làm độ phức tạp rất khác nhau:

- **Cách A (đơn giản, khuyến nghị P0)**: Editor gán tay danh sách sản phẩm gợi ý theo từng bài/từng sản phẩm (tái dùng cơ chế `related_product_ids` đã có ở Module A) — không cần engine riêng.
- **Cách B (P2, phức tạp hơn)**: Engine tự động dựa trên category/purchase history (VD: mua Tee → gợi ý Trouser cùng bộ sưu tập). Cần thêm bảng mapping category → category gợi ý, và logic loại trừ sản phẩm đã mua.

Đề xuất build Cách A trước cho Day 21 "Complete the silhouette" và Day 7 "Complete the look", vì tận dụng lại đúng data model đã có, không phát sinh entity mới.

---

## 10. Module I — Editorial Collection Launch

**Data model:** `Collection { id, name, launch_date, article_sequence_ids (ordered array FK Article), product_ids[] }`

**Requirements**
- **P1**: Admin tạo Collection, gắn chuỗi bài Journal theo thứ tự đếm ngược tới `launch_date`.
- **P1**: Trang Collection hiển thị timeline các bài đã/sắp publish trong chuỗi + CTA "Shop Now" xuất hiện sau `launch_date`.
- **P2**: Tự động schedule publish từng bài theo lịch định trước launch_date (VD: J-4, J-3, J-2, J-1) thay vì editor tự set từng `published_at`.

---

## 11. Module J — Analytics / Event Tracking

**Phải làm từ Phase 1** dù dashboard hiển thị (nếu có) để Phase 2 — vì tracking thiếu từ đầu thì không thể truy hồi dữ liệu lịch sử sau này.

**Sự kiện tối thiểu cần log (P0):**

| Event | Payload chính |
|---|---|
| `article_viewed` | article_id, customer_id (nullable nếu anonymous), pillar |
| `article_product_click` | article_id, product_id — đo hiệu quả commercial bridge |
| `article_saved` | article_id, customer_id |
| `signup_completed` | customer_id, source (`journal` nếu tới từ Journal, `direct`, `checkout`, ...) |
| `points_earned` / `points_redeemed` | customer_id, amount, reason |
| `tier_changed` | customer_id, from_tier, to_tier |
| `journey_step_sent` | order_id, step_name |
| `review_submitted` | order_id, product_id, rating |

**Requirements**
- **P0**: Emit các event trên (dùng lại hệ thống analytics/event bus hiện có nếu đã có; nếu chưa có, log vào 1 bảng `events` đơn giản trước, không cần dựng data warehouse ở giai đoạn này).
- **P2**: Dashboard tổng hợp KPI (article → signup conversion, Journal readers' repeat-purchase rate so với non-readers, v.v.) — build sau khi có đủ dữ liệu tích lũy (tối thiểu vài tuần).

---

## 12. Lộ trình theo giai đoạn

**Phase 1 — MVP (chạy được vòng lặp cốt lõi)**
Module A (P0 only), Module B (P0), Module C (P0 — earn + tier tính tự động, threshold mặc định), Module D (chỉ Day 0 + Day 7, chưa cần toàn bộ chuỗi), Module E (P0), Module F (P0), Module J (P0, log-only chưa cần dashboard).

**Phase 2 — Vòng lặp đầy đủ**
Module D (đủ Day 0→30 + điều kiện dừng), Module C (thêm ICON tier, redemption), Module H (Cách A), Module I (P1), Module J (dashboard).

**Phase 3 — Mở rộng**
Win-back journey sau Day 30, Module G filter cảnh báo, Module H Cách B (engine tự động), Module I P2 (auto-schedule).

---

## 13. Open Questions (chặn trước khi code, không phải chờ trong lúc code)

1. **Kênh CRM chính** (email / app push / SMS / Zalo OA) — chặn Module D vì ảnh hưởng trực tiếp `NotificationSender` interface và cả UX QR/journey. → Cần **business** quyết định.
2. **Ngưỡng tier chính xác** (số đơn, hay chi tiêu, hay cả hai) cho PRIVÉ và ICON — chặn Module C. → **Business**.
3. **Đồng ý thu thập dữ liệu hành vi đọc bài để cá nhân hoá** — có cần cơ chế opt-in rõ ràng theo quy định bảo vệ dữ liệu cá nhân hiện hành không, đặc biệt khi lưu `saved_articles` và gắn với profile cá nhân hoá. → **Legal/compliance**.
4. **Recommendation: gán tay hay engine tự động** (Module H, Cách A vs B) — quyết định trước vì ảnh hưởng lớn đến effort. → **Product + Engineering**.
5. **QR code gắn theo customer hay theo order** (Module E) — ảnh hưởng cách in bao bì và luồng auth. → **Product + Vận hành đóng gói**.
6. **Journey nhiều đơn chồng nhau** — nếu khách mua đơn 2 khi đơn 1 chưa xong journey Day 30, có huỷ journey đơn 1 luôn không hay để nó chạy song song? Đề xuất trong Module D là auto-cancel đơn cũ, nhưng cần business xác nhận đây có đúng hành vi mong muốn không. → **Product**.

---

## 14. Ghi chú cho Claude Code khi triển khai

- Đây là **mở rộng** hệ thống hiện có, không phải rewrite — trước khi code từng module, đọc schema Customer/Order/Product hiện tại để map đúng tên field/convention đã dùng, tránh tạo field trùng ý nghĩa khác tên.
- Ưu tiên build theo đúng thứ tự Phase 1 → 2 → 3 ở mục 12; đừng bắt đầu Module H Cách B hay Module I P2 trước khi Module A–D P0 chạy ổn định — schema của các module sau phụ thuộc dữ liệu từ Module A/C/D.
- Mọi cron/job trong Module D bắt buộc viết idempotent (test lại chạy 2 lần không gửi trùng) — đây là lỗi dễ gặp nhất với hệ thống trigger theo thời gian.
- Instrument event (Module J) ngay trong cùng PR khi build tính năng tương ứng, không để "làm sau" — nếu không sẽ mất dữ liệu lịch sử của giai đoạn đầu launch, đúng đằng nào cũng phải log nên log từ đầu rẻ hơn nhiều so với thêm sau.
