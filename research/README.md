# Nghiên cứu: Virtual Try-On và Fashion AI

Phần học đi kèm `maeven-ai-stylist-tryon-plan.md`. Mọi thứ ở đây chạy trên **Kaggle Notebook** (có GPU miễn phí theo hạn mức hằng tuần), **không** ảnh hưởng tới site.

| Bước | Thư mục | Học gì | License | Dùng thương mại |
|---|---|---|---|---|
| 1 | [`01-catvton/`](01-catvton/catvton_maeven.ipynb) | Quy trình try-on trọn vẹn: tách người → mask → diffusion | CC BY-NC-SA 4.0 | Không |
| 2 | [`02-leffa/`](02-leffa/NOTES.md) | Kiến trúc hai UNet, flow field trong attention, đánh đổi tốc độ và chất lượng | Code MIT, dữ liệu train phi thương mại | Có rủi ro, xem ghi chú |
| 3 | [`03-fashion-siglip/`](03-fashion-siglip/fashion_siglip_maeven.ipynb) | Vector ảnh và chữ: gắn nhãn tự động, "phối với đồ đã có", tìm bằng chữ | Apache 2.0 | Có |

**Ảnh tạo ra từ bước 1 và 2 không được đưa lên site.** Site dùng ảnh try-on tạo bằng dịch vụ có license thương mại (Phase 4a trong plan).

## Chuẩn bị một lần

1. Tài khoản Kaggle **đã xác minh số điện thoại**. Có xác minh mới bật được Internet và GPU.
2. Tạo dataset `maeven-tryon` (*Datasets → New Dataset*), upload theo cấu trúc:

   ```
   maeven-tryon/
     garments/   mv-01.jpg … mv-04.jpg   ← ảnh sản phẩm, đặt tên theo SKU
     persons/    *.jpg                   ← người mẫu đứng thẳng, chính diện (bước 1)
     wardrobe/   *.jpg                   ← vài món đồ bất kỳ để thử ghép (bước 3, không bắt buộc)
   ```

   Chưa có ảnh sản phẩm thật thì tạm dùng `public/img/product/0X-*.jpg` của repo, đổi tên thành `mv-0X.jpg`. Nhớ rằng đó là ảnh stock.
3. *Notebooks → New → File → Import Notebook*, chọn file `.ipynb` của từng bước.
4. Trong notebook: *Add Input* → `maeven-tryon`. *Settings*: **Internet On**, **Accelerator GPU T4 x2** (bước 3 chạy CPU cũng được).

Code trong hai notebook đã được chạy thử với model giả lập trên CPU (Python 3.11): import, đọc dataset, vòng lặp, lưu file. Phần chạy model thật trên GPU chưa test, vì môi trường của Claude không truy cập được Hugging Face.

## Nhật ký thí nghiệm

Ghi lại sau mỗi lần chạy. Mục đích là có **số liệu thật** để quyết định, và nếu muốn thì viết thành một bài Tạp chí.

| Ngày | Bước | Sản phẩm × người mẫu | Cài đặt | s/ảnh | Màu | Chất vải | Phom | Danh tính | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| | 1 · CatVTON | mv-01 × regular | 50 bước, guidance 2.5, fp16, T4 | | ✓ / ✗ | | | | |

## Sau ba bước

- **Polyvore** ([Marqo/polyvore](https://huggingface.co/datasets/Marqo/polyvore)): học bài toán "những món nào **hợp** nhau", không chỉ "giống" nhau.
- **DressCode**: dataset có cả quần. VITON-HD chỉ có áo, nên DressCode hợp với mv-02 hơn. Phải ký thoả thuận phi thương mại để tải.
- So CatVTON với Leffa trên cùng bộ ảnh, rồi so với ảnh do dịch vụ trả phí tạo ra. Ba cột kết quả đặt cạnh nhau là đủ để thấy khoảng cách.
