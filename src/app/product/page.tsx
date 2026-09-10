import type { Metadata } from "next";
import FlipCard from "@/components/motion/FlipCard";
import { BRAND, PRODUCTS, PROMISES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Cửa hàng",
  description:
    "Bốn mẫu đầu của bộ SS26, dệt tại Nam Định và Bảo Lộc. Một mức giá suốt vòng đời sản phẩm.",
};

export default function ProductIndexPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6 sm:pt-11 sm:pb-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-5">
        <h1 className="m-0 font-display text-[clamp(30px,4.8vw,58px)] font-extrabold tracking-[-0.02em]">
          Cửa hàng
        </h1>
        <span className="mono-label text-[10.5px] text-smoke">
          {BRAND.season} · {PRODUCTS.length} trong 14 mẫu · còn lại ra mắt tháng 10
        </span>
      </div>

      <p className="mt-6 max-w-[56ch] text-base leading-[1.75] text-graphite">
        Mỗi mùa một bộ hẹp. Chất liệu tự nhiên, phom dựng vai rõ, tên xưởng dệt in
        trên nhãn. Giá giữ nguyên suốt vòng đời sản phẩm.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <FlipCard key={p.sku} product={p} />
        ))}
      </div>

      <section className="mt-16 grid gap-7 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {PROMISES.map((p) => (
          <div key={p.kicker}>
            <div className="mono-label mb-2.5 text-[10.5px] text-forest">{p.kicker}</div>
            <p className="m-0 text-[15px] leading-[1.7] text-graphite">{p.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
