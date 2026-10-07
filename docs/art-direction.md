# MAEVEN — Art direction "Khung" (Modern Minimal)

Brief chung cho mọi agent làm giao diện. Đọc hết trước khi sửa UI trang chủ hoặc cửa hàng.
Phạm vi đợt này: `/`, `/product`, `/product/[sku]`. ScrollSmoother: bật. Concept biên tập/thơ ("Sổ triều") đã bị loại, giữ tối giản hiện đại.

## 1. Tham chiếu → nguyên lý

| Tham chiếu | Lấy về |
|---|---|
| Swiss / International Typographic Style | Lưới 12 cột hiện bằng hairline, căn trái tuyệt đối, bất đối xứng có hệ thống |
| COS, Arket, Lemaire, Fear of God Essentials | Đơn sắc, ảnh sản phẩm trên nền trung tính, rất nhiều khoảng trống, UI lùi lại |
| Teenage Engineering, Nothing, Vercel | Nhãn mono chính xác, số liệu là trang trí duy nhất, motion có "tiếng click" cơ khí |
| Awwwards fashion hiện đại | Một khoảnh khắc pin lớn, chuyển Lưới ↔ Danh mục bằng Flip, ảnh lộ bằng mask thay vì fade |

**Nguyên lý:**
1. **Lưới là trang trí.** Hairline 1px của cột và hàng hiện ra có chủ đích. Mọi phần tử bám cột.
2. **Tương phản tỉ lệ.** Nhãn mono 11px đặt cạnh chữ display 18–22vw, không có cỡ "trung bình nhạt".
3. **Đơn sắc.** Chỉ dùng ink/paper. Mint là **tín hiệu duy nhất** (trạng thái active, số lượng trong giỏ, focus), chiếm dưới 1% diện tích.
4. **Một ý mỗi màn.** Toàn site tối đa 3 khoảnh khắc đặc trưng, phần còn lại im lặng.
5. **Motion cơ khí.** Chuyển động theo trục ngang hoặc dọc, mask reveal, `power4.out`/`expo.out`, 0.6–0.9s. Không nảy, không xoay, không blur.

## 2. Nhận diện

- **Typography: một họ chữ + mono.**
  - **Archivo variable cho cả display lẫn body**, thay Nunito Sans. Body đặt `wdth 100`, `wght 400`. Display dùng `wdth` 62–125 làm biến số thị giác: tiêu đề nén hẹp và cao (wdth ~75) đặt cạnh wordmark giãn rộng.
  - **IBM Plex Mono** cho nhãn, số thứ tự, giá, folio dạng `01 / Mới về` (chỉ số + tên, không ký hiệu §).
  - Thang chữ thành token `@theme`: `--text-mega` (clamp tới 22vw), `--text-display`, `--text-headline`, `--text-body`, `--text-label`.
  - **Tiếng Việt:** dấu chồng (Ộ, Ẫ, Ữ) bị cắt khi `leading` < 0.92 hoặc khi dùng line-mask. Leading display tối thiểu là 0.92, và mask phải có padding-top.
- **Màu:** gom bảng màu dư thừa về **ink, paper, 2 cấp xám, 1 hairline**, và mint làm tín hiệu. Bỏ `sand` và `mint-wash` khỏi trang chủ và cửa hàng (vẫn giữ token để các trang khác không vỡ).
- **Lưới:** container 12 cột, gutter cố định. Component `GridLines` vẽ hairline cột ở hero và cửa hàng (aria-hidden), ẩn dưới 768px.
- **Ảnh:** khung tỉ lệ cố định (4:5, 1:1), không bo góc, không bóng, không viền.

## 3. Ba khoảnh khắc đặc trưng

1. **Hero — "Khung đóng lại".**
   - Lúc tải: một timeline ngắn (~1.2s). Ảnh/video lộ từ `inset(0 0 100% 0)`, rồi tiêu đề lộ từng dòng bằng SplitText mask, rồi nhãn mono gõ ra bằng stagger theo ký tự.
   - Khi cuộn (desktop, pin khoảng 70vh): ảnh full-bleed co về đúng **ô 8 cột** của lưới, các hairline cột hiện dần. Wordmark **maeven** phủ đúng 100% chiều ngang phía dưới, và trục `wdth` nén 125→75 theo scrub.
2. **Sổ mẫu ngang (Campaign).** Section được pin, 4 look trượt ngang trên lưới theo scrub. Bộ đếm mono `01 / 04` đổi số kiểu cơ khí (cuộn dọc từng chữ số), thanh tiến trình là một hairline chạy `scaleX`. Trên mobile bỏ pin, xếp dọc và ảnh lộ bằng mask.
3. **Cửa hàng — Lưới ↔ Danh mục (Flip).**
   - Chế độ Danh mục là các hàng chữ display nén (wdth ~75) gồm số, tên, chất liệu và giá căn theo cột. Rê chuột vào thì ảnh bám con trỏ (`quickTo`, chỉ khi có fine pointer) và các hàng khác mờ xuống 0.3.
   - Bàn phím và touch: focus hoặc tap thì hiện thumbnail inline.

## 4. Các lớp im lặng

- **Tiêu đề section:** dùng `SplitReveal` (line mask, dịch y 100% → 0), thay fade-up của `Reveal` cho h1/h2. `Reveal` vẫn giữ cho đoạn văn.
- **Ảnh:** `ImageReveal` lộ ảnh bằng mask inset theo một trục, kèm ảnh bên trong scale 1.08 → 1.
- **Hairline:** các đường kẻ section vẽ ra bằng `scaleX` từ trái sang khi section vào viewport.
- **Marquee:** chuyển thành dải mono nhỏ, tốc độ phản ứng với vận tốc cuộn (`ScrollTrigger.getVelocity`). Bỏ mọi hiệu ứng khác.
- **Big wordmark + "Mười bốn mẫu…":** các từ đổi opacity từ 0.15 lên 1 theo scrub (`ScrubWords`).
- **Xưởng:** bảng 3 cột (số, xưởng, nơi), hairline vẽ theo stagger.
- **Chi tiết sản phẩm:**
  - Desktop: gallery ảnh 4:5 xếp dọc chiếm 7 cột, BuyPanel chiếm 5 cột và được pin bằng ScrollTrigger (vì sticky không chạy trong smoother).
  - Tên sản phẩm dùng display nén, kèm `01` mono lớn. Chuyển size và ảnh dùng Flip cho chỉ báo active.
- **Hover:** gạch chân link vẽ bằng `scaleX`. Card sản phẩm có ảnh scale 1.03 và dòng giá trượt lên. Không tilt.
  - `Tilt` và các hiệu ứng 3D trong `FlipCard` bị loại khỏi cửa hàng vì không hợp tối giản. `FlipCard` được thay bằng card phẳng hoặc chế độ Lưới.

## 5. Kiến trúc kỹ thuật

**Nền tảng (dùng lại / mở rộng):**
- `src/lib/gsap.ts`: đăng ký một lần `ScrollTrigger, ScrollSmoother, SplitText, Flip`. Thêm `EASE_SNAP = "power4.out"` và `DUR_FAST = 0.6`. Bỏ các lời gọi `registerPlugin(ScrollTrigger)` rải rác trong `HeroStage.tsx` và `Reveal.tsx`.
- `src/lib/motion.ts`: dùng lại `useReducedMotion`, `usePointerEffects`, `useMounted`.
- `src/app/globals.css`: thêm token thang chữ, rút gọn màu dùng trên 2 trang. Đặt `body` dùng `--font-display` ở `wdth 100`.
- `src/app/layout.tsx`: bỏ Nunito (kiểm tra các trang khác vẫn đọc tốt với Archivo) và bọc nội dung bằng `SmoothScroll`.

**ScrollSmoother (rủi ro chính):**
- Component mới `src/components/motion/SmoothScroll.tsx` tạo `#smooth-wrapper > #smooth-content` bao `children + SiteFooter`. **`SiteHeader`, `CartDrawer`, `WelcomeOffer` nằm ngoài wrapper.**
- `SiteHeader` chuyển từ `sticky` sang `fixed`, thêm spacer. Header trong suốt khi ở trên hero, đặc khi đã cuộn qua (ScrollTrigger toggle class).
- Cấu hình: `smooth: 1, effects: true, smoothTouch: false`. **Không tạo smoother khi reduced-motion.**
- Khi `usePathname` đổi thì gọi `smoother.scrollTo(0)` và `ScrollTrigger.refresh()`. Khi cart hoặc WelcomeOffer mở thì gọi `smoother.paused(true)`. Focus bằng Tab phải cuộn tới phần tử.

**Primitive mới** trong `src/components/motion/`, đều dùng `useGSAP` + `gsap.matchMedia` theo mẫu `Reveal.tsx`:
- `SplitReveal`: line mask, giữ `aria-label`, đợi `document.fonts.ready`, revert khi resize.
- `ImageReveal`: bọc `Photo`.
- `ScrubWords`.
- `Hairline`: đường kẻ vẽ theo `scaleX`.
- `GridLines`: server component, chỉ CSS.
- `Counter`: số mono đổi kiểu cơ khí.

**File chính:**
- Trang chủ: `src/app/page.tsx`, `src/components/hero/HeroStage.tsx`, `src/components/Campaign.tsx`, `src/components/Marquee.tsx`, `src/components/SiteHeader.tsx`.
- Cửa hàng: `src/app/product/page.tsx` (+ client mới `ProductIndex.tsx` có chế độ Flip), `src/app/product/[sku]/page.tsx`, `src/app/product/[sku]/BuyPanel.tsx`, `src/components/ProductCard.tsx`.
- **Không** đụng `src/lib/data.ts`, infra hay workflows.

**Ràng buộc** (đã có trong `.claude/agents/art-director.md`):
- reduced-motion dùng nhánh `matchMedia`: không pin, không smoother, hiện trạng thái cuối.
- Không đặt `opacity: 0` trong CSS.
- Chỉ animate `transform`, `opacity` và `clip-path`.
- Mobile có layout riêng.

