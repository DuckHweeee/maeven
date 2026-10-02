# Leffa: ghi chú đọc code

Bước 2 trong lộ trình học. Mục tiêu: hiểu Leffa khác CatVTON ở đâu, và vì sao "code MIT" chưa có nghĩa là "dùng thương mại được".

- Paper: [arXiv 2412.08486](https://arxiv.org/abs/2412.08486) (CVPR 2025)
- Code: [github.com/franciszzj/Leffa](https://github.com/franciszzj/Leffa)
- Weights: [huggingface.co/franciszzj/Leffa](https://huggingface.co/franciszzj/Leffa)

Ghi chú này viết dựa trên bản code đọc ngày 01.10.2026.

---

## 1. Ý tưởng trong một câu

Khi ghép áo lên người, model diffusion thường làm méo chi tiết: chữ, sọc, đường may. Leffa thêm một **hàm loss lúc train** để ép lớp attention "nhìn đúng chỗ" trên ảnh áo. Mỗi điểm trên người mẫu phải lấy thông tin từ đúng điểm tương ứng trên áo, giống như một **trường dòng chảy** (flow field) kéo áo vào người.

> **Repo chỉ công bố phần inference.** Không có script train, và hàm Leffa loss không nằm trong `leffa/`. Muốn hiểu loss thì đọc mục 3 của paper.

## 2. So sánh kiến trúc với CatVTON

| | CatVTON (bước 1) | Leffa |
|---|---|---|
| Số UNet | **1**. Ảnh người và ảnh áo được ghép cạnh nhau, đưa qua cùng một UNet | **2**. `GenerativeUNet` vẽ ảnh kết quả, `ReferenceUNet` đọc ảnh áo |
| Text encoder | Không | Không. Cả hai UNet đều bị bỏ cross-attention (`remove_cross_attention` trong `leffa/model.py`) |
| Đầu vào UNet chính | Latent ảnh người + áo ghép lại | **12 kênh**: noisy latent 4 + mask 1 + ảnh đã che vùng áo 4 + densepose 3 (`new_in_channels=12`, `leffa/model.py:23`) |
| Áo đi vào thế nào | Qua self-attention, vì hai ảnh nằm chung một tensor | Đặc trưng từ `ReferenceUNet` được đưa vào attention của `GenerativeUNet` (`leffa/diffusion_model/attention_ref.py`) |
| Phần được train | Chỉ attention, 49,57M tham số | Cả hai UNet, cộng thêm Leffa loss lên attention map |
| Tạo mask | DensePose + SCHP (`model/cloth_masker.py`) | Human parsing (SCHP chạy ONNX) + **OpenPose** keypoints → `get_agnostic_mask_hd/dc` |
| Model nền | SD 1.5 inpainting | SD 1.5 inpainting cho try-on, SDXL inpainting cho pose transfer |
| Làm được thêm | Chỉ try-on | Try-on **và đổi tư thế** (pose transfer) |

## 3. Thứ tự đọc code

1. **`app.py` → `LeffaPredictor.leffa_predict`**: toàn bộ quy trình trong khoảng 80 dòng.
   - `resize_and_center` đưa ảnh về 768×1024.
   - `Parsing` + `OpenPose` chạy ở 384×512, cho ra mask vùng áo.
   - `DensePosePredictor.predict_seg` (VITON-HD) hoặc `predict_iuv` (DressCode) cho bản đồ cơ thể.
   - `LeffaTransform` chuẩn hoá thành tensor, rồi `LeffaInference` chạy diffusion.
   - Để ý: `self.mask_predictor` (AutoMasker) được khởi tạo nhưng **không dùng** trong nhánh try-on.
2. **`leffa/model.py` → `replace_conv_in_layer`**: cách nới `conv_in` từ 9 kênh của SD inpainting lên 12 (thêm 3 kênh densepose). Trọng số cũ được chép sang, kênh mới khởi tạo bằng 0, nên lúc đầu model vẫn chạy y như model gốc. Đây là mẹo chung khi "dạy" model có sẵn nhận thêm đầu vào.
3. **`leffa/pipeline.py` → `__call__`**: vòng lặp khử nhiễu.
   - `masked_image = src_image * (mask < 0.5)` che vùng áo cũ.
   - Mỗi bước: `ReferenceUNet` mã hoá áo, rồi `GenerativeUNet` dự đoán nhiễu.
   - **`ref_acceleration=True`**: chỉ chạy `ReferenceUNet` **một lần** ở bước giữa thay vì mỗi bước. Repo ghi nhanh hơn khoảng 30%. Đáng thử, vì đây là kiểu đánh đổi tốc độ và chất lượng hay gặp.
4. **`leffa/diffusion_model/attention_ref.py`**: chỗ đặc trưng của áo được trộn vào attention. Đọc cùng paper để thấy loss sẽ tác động vào đâu.

## 4. License: "MIT" chưa đủ

| Thành phần | License | Ghi chú |
|---|---|---|
| Code Leffa | MIT | Dùng thương mại được |
| Weights `virtual_tryon.pth`, `virtual_tryon_dc.pth` | Model card ghi MIT | Nhưng được **train trên VITON-HD và DressCode**, hai dataset chỉ cho phép nghiên cứu phi thương mại |
| SD 1.5 inpainting (model nền) | CreativeML OpenRAIL-M | Cho thương mại, kèm danh sách cấm sử dụng |
| OpenPose body model (tạo mask) | Giấy phép học thuật của CMU | Muốn dùng thương mại phải mua license riêng |
| DensePose / detectron2 | Apache 2.0 | |

**Kết luận cho MAEVEN:** tự host Leffa để làm sản phẩm thương mại vẫn có rủi ro, vì dữ liệu train và OpenPose đều là phi thương mại. Cần người có chuyên môn pháp lý xem trước khi dùng. Với mục tiêu học thì không có vấn đề gì. Đây cũng là lý do plan chọn tạo ảnh try-on bằng dịch vụ trả phí có license rõ ràng (Phase 4a).

## 5. (Tuỳ chọn) Chạy trên Kaggle

Mới kiểm tra được phần import chạy trên Python 3.11. Chưa chạy trên GPU.

`app.py` gọi `snapshot_download` toàn bộ repo HF **ngay khi import**, kể cả SDXL inpainting cho pose transfer (rất nặng). Vì vậy không `import app`, mà tự dựng predictor chỉ cho try-on:

```python
!git clone -q --depth 1 https://github.com/franciszzj/Leffa.git /kaggle/working/Leffa
%cd /kaggle/working/Leffa
!pip install -q onnxruntime einops timm fvcore omegaconf pycocotools cloudpickle av diffusers transformers accelerate

from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="franciszzj/Leffa", local_dir="./ckpts",
    ignore_patterns=["stable-diffusion-xl-1.0-inpainting-0.1/*", "pose_transfer.pth"],
)

import numpy as np
from PIL import Image
from leffa.transform import LeffaTransform
from leffa.model import LeffaModel
from leffa.inference import LeffaInference
from leffa_utils.densepose_predictor import DensePosePredictor
from leffa_utils.utils import resize_and_center, get_agnostic_mask_hd
from preprocess.humanparsing.run_parsing import Parsing
from preprocess.openpose.run_openpose import OpenPose

densepose = DensePosePredictor(
    config_path="./ckpts/densepose/densepose_rcnn_R_50_FPN_s1x.yaml",
    weights_path="./ckpts/densepose/model_final_162be9.pkl",
)
parsing = Parsing(atr_path="./ckpts/humanparsing/parsing_atr.onnx", lip_path="./ckpts/humanparsing/parsing_lip.onnx")
openpose = OpenPose(body_model_path="./ckpts/openpose/body_pose_model.pth")
inference = LeffaInference(model=LeffaModel(
    pretrained_model_name_or_path="./ckpts/stable-diffusion-inpainting",
    pretrained_model="./ckpts/virtual_tryon.pth",
    dtype="float16",
))

def leffa_try_on(person_path, garment_path, garment_type="upper_body", ref_acceleration=False, steps=50, scale=2.5, seed=42):
    """Rút gọn từ LeffaPredictor.leffa_predict, chỉ nhánh virtual_tryon + viton_hd."""
    src = resize_and_center(Image.open(person_path), 768, 1024).convert("RGB")
    ref = resize_and_center(Image.open(garment_path), 768, 1024)
    model_parse, _ = parsing(src.resize((384, 512)))
    keypoints = openpose(src.resize((384, 512)))
    mask = get_agnostic_mask_hd(model_parse, keypoints, garment_type).resize((768, 1024))
    seg = Image.fromarray(densepose.predict_seg(np.array(src))[:, :, ::-1])
    data = LeffaTransform()({"src_image": [src], "ref_image": [ref], "mask": [mask], "densepose": [seg]})
    out = inference(data, ref_acceleration=ref_acceleration, num_inference_steps=steps,
                    guidance_scale=scale, seed=seed, repaint=False)
    return out["generated_image"][0]
```

Thí nghiệm đáng làm: chạy cùng cặp ảnh người và áo với CatVTON (notebook bước 1) và Leffa, có và không có `ref_acceleration`. Ghi thời gian và so chi tiết đường may, cổ áo, sọc vải.
