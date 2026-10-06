import type { Metadata } from "next";
import GridLines from "@/components/motion/GridLines";
import Hairline from "@/components/motion/Hairline";
import SplitReveal from "@/components/motion/SplitReveal";
import { BRAND, PRODUCTS, PROMISES } from "@/lib/data";
import ProductIndex, { type IndexItem } from "./ProductIndex";

export const metadata: Metadata = {
  title: "Cửa hàng",
  description:
    "Bốn mẫu đầu của bộ SS26, dệt tại Nam Định và Bảo Lộc. Một mức giá suốt vòng đời sản phẩm.",
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function ProductIndexPage() {
  // Only what the client view renders crosses the server/client boundary.
  const items: IndexItem[] = PRODUCTS.map((p) => ({
    no: p.no,
    sku: p.sku,
    name: p.name,
    price: p.price,
    material: p.material,
    image: p.gallery[0],
    workshop: p.maker.workshop,
    place: p.maker.place,
  }));

  return (
    <main id="main" tabIndex={-1} className="relative pb-20 outline-none sm:pb-28">
      <GridLines />

      {/* ----------------------------------------------------------- header */}
      <header className="relative grid-12 pt-8 sm:pt-12">
        <p className="col-span-6 m-0 font-mono text-label text-smoke uppercase">01 / Cửa hàng</p>
        <p className="col-span-6 m-0 text-right font-mono text-label text-smoke uppercase">
          {BRAND.season} — {pad(PRODUCTS.length)} / 14 mẫu
        </p>

        <SplitReveal
          as="h1"
          trigger="load"
          className="col-span-12 mt-6 mb-0 text-mega font-semibold [font-stretch:75%] sm:mt-10"
        >
          Cửa hàng
        </SplitReveal>

        <p className="col-span-12 mt-8 mb-0 max-w-[46ch] text-body text-graphite md:col-span-5 md:col-start-7 md:mt-10">
          Mỗi mùa một bộ hẹp. Chất liệu tự nhiên, phom dựng vai rõ, tên xưởng dệt in
          trên nhãn. Giá giữ nguyên suốt vòng đời sản phẩm.
        </p>
      </header>

      {/* ----------------------------------------------- grid ↔ index list */}
      <section aria-label="Sản phẩm" className="relative mt-16 sm:mt-24">
        <ProductIndex items={items} />
      </section>

      {/* --------------------------------------------------------- promises */}
      <section aria-labelledby="promises-title" className="relative grid-12 mt-24 sm:mt-36">
        <p className="col-span-12 m-0 font-mono text-label text-smoke uppercase md:col-span-3">
          03 / Cam kết
        </p>
        <h2 id="promises-title" className="sr-only">
          Cam kết
        </h2>
        <ol className="col-span-12 m-0 mt-6 grid list-none gap-y-10 p-0 md:col-span-9 md:mt-0 md:grid-cols-3 md:gap-x-(--grid-gutter)">
          {PROMISES.map((p, i) => (
            <li key={p.kicker}>
              <Hairline className="bg-ink" delay={i * 0.08} />
              <div className="mt-4 font-mono text-label tracking-normal text-smoke tabular-nums">
                {pad(i + 1)}
              </div>
              <h3 className="mt-6 mb-0 text-headline font-semibold [font-stretch:75%]">
                {p.kicker}
              </h3>
              <p className="mt-4 mb-0 max-w-[36ch] text-[15px] leading-[1.65] text-graphite">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
