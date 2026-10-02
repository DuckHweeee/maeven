import type { Metadata } from "next";
import Link from "next/link";
import Photo from "@/components/Photo";
import Parallax from "@/components/motion/Parallax";
import Reveal from "@/components/motion/Reveal";
import {
  ARTICLES,
  PROMISES,
  WORKSHOP_COUNT,
  WORKSHOP_PLACES,
  WORKSHOPS,
  viCount,
  viList,
} from "@/lib/data";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Về MAEVEN — Câu chuyện đằng sau smart casual",
  description:
    "MAEVEN bắt đầu từ Vũng Tàu — nơi một buổi sáng có thể đi từ kỷ luật tuyệt đối ra thẳng biển khơi. Đây là lý do vì sao chúng tôi làm smart casual.",
};

export default function AboutPage() {
  // The workshops are the product data, not a second copy of it — a name that
  // changes on a label changes here too. Deduplicated in data.ts, because two
  // products can share a workshop and this list shows workshops, not products.
  const workshops = WORKSHOPS;
  // Counted rather than written down: the sentence below is a promise about
  // what the magazine does, so it must not be able to drift from the articles.
  const disclosed = ARTICLES.filter((a) => a.relatedSkus.length > 0).length;
  // Same reason as `disclosed`: the heading and the sentence below both state a
  // number that the list right underneath them would contradict if it drifted.
  const howMany = viCount(WORKSHOP_COUNT);
  const where = viList(WORKSHOP_PLACES);

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-24">
      <div className="grid items-end gap-8 border-b border-line pb-10 md:grid-cols-2 md:gap-12 md:pb-[52px]">
        <div>
          <div className="mono-label mb-5 text-[11px] text-smoke">Giới thiệu</div>
          <h1 className="m-0 mb-5 font-display text-[clamp(36px,6.4vw,88px)] leading-[0.98] font-extrabold tracking-[-0.03em]">
            Simply
            <br />
            <span className="text-forest">Distinct</span>
          </h1>
          <p className="m-0 max-w-[48ch] text-base leading-[1.75] text-graphite">
            {BRAND.name} bắt đầu năm 2026 với mười bốn mẫu cho một mùa. Làm ở{" "}
            {howMany} xưởng tại {where}. Tên xưởng in trên nhãn từng chiếc áo, vì
            đó là thứ quyết định chiếc áo bền được bao lâu.
          </p>
        </div>
        <Parallax amount={70}>
          <Photo
            src="/img/brand/hero.jpg"
            alt="Áo sơ mi lanh mộc treo trên móc gỗ dưới ánh sáng ban ngày"
            ratio="4 / 5"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </Parallax>
      </div>

      {/* -------------------------------------------------------- xưởng */}
      <section className="border-b border-line py-10 sm:py-[52px]">
        <h2 className="mono-label mb-6 text-[11px] text-smoke">{howMany} xưởng</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {workshops.map((w, i) => (
            <Reveal key={w.sku} delay={(i % 2) * 80}>
              <div className="border-t border-ink pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 font-display text-[20px] font-bold tracking-[-0.015em] sm:text-[23px]">
                    {w.workshop}
                  </h3>
                  <span className="mono-label text-[10px] text-forest">{w.place}</span>
                </div>
                <p className="mt-2.5 mb-0 text-[14.5px] leading-[1.7] text-graphite">
                  {w.story}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- cam kết */}
      <section className="border-b border-line py-10 sm:py-[52px]">
        <h2 className="mono-label mb-6 text-[11px] text-smoke">Cam kết</h2>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p.kicker} className="border-t-4 border-mint pt-4">
              <h3 className="m-0 mb-2.5 font-display text-[20px] font-bold sm:text-[23px]">
                {p.kicker}
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.7] text-graphite">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- tạp chí */}
      <section className="grid gap-8 border-b border-line py-10 sm:py-[52px] md:grid-cols-2 md:gap-14">
        <div>
          <h2 className="mono-label mb-4 text-[11px] text-smoke">Vì sao có tạp chí</h2>
          <p className="m-0 mb-4 max-w-[52ch] text-base leading-[1.75] text-graphite">
            Tạp chí ra hai bài mỗi tuần, thứ Tư và thứ Bảy. Chúng tôi không viết
            về sản phẩm của mình trong đó.
          </p>
          <p className="m-0 max-w-[52ch] text-base leading-[1.75] text-graphite">
            Biên tập viên được trả lương để viết chứ không phải để bán, và tên họ
            nằm dưới mỗi tiêu đề. Một thương hiệu bán mười bốn mẫu thì không có gì
            nhiều để nói mỗi tuần. Một tòa soạn thì có.
          </p>
        </div>

        <div>
          <h2 className="mono-label mb-4 text-[11px] text-smoke">
            Không nhận bài tài trợ
          </h2>
          <p className="m-0 mb-4 max-w-[52ch] text-base leading-[1.75] text-graphite">
            Tạp chí không nhận tiền để viết về bất kỳ thương hiệu nào, kể cả
            những xưởng dệt vải cho chúng tôi.
          </p>
          <p className="m-0 max-w-[52ch] text-base leading-[1.75] text-graphite">
            Nếu một bài nhắc đến sản phẩm của {BRAND.name}, bài đó sẽ ghi rõ ngay
            dưới tiêu đề. Hiện có {disclosed} trong {ARTICLES.length} bài đã đăng
            mang dòng đó.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-4 py-10 sm:py-[52px]">
        <Link
          href="/product"
          className="border border-ink px-6 py-[13px] text-[12.5px] tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Xem bộ sưu tập
        </Link>
        <Link
          href="/magazine"
          className="border border-line-3 px-6 py-[13px] text-[12.5px] tracking-[0.14em] uppercase transition-colors hover:border-ink"
        >
          Vào tạp chí
        </Link>
      </section>
    </main>
  );
}
