import Image from "next/image";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import ArticleCard from "@/components/ArticleCard";
import ProductCard from "@/components/ProductCard";
import HeroStage from "@/components/hero/HeroStage";
import InfiniteSlider from "@/components/motion/InfiniteSlider";
import KineticHeading from "@/components/motion/KineticHeading";
import Reveal from "@/components/motion/Reveal";
import AutoCarousel from "@/components/motion/AutoCarousel";
import CustomerCard from "@/components/CustomerCard";
import { ARTICLES, CUSTOMER_POSTS, PRODUCTS } from "@/lib/data";
import { BRAND } from "@/lib/constants";

export default function HomePage() {
  const latest = ARTICLES.slice(0, 3);

  return (
    <main>
      {/* ---------------------------------------------------------- hero */}
      <HeroStage src="/img/home/hero.jpg" alt="Sổ mẫu SS26 — ánh sáng buổi sớm">
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="mono-label mb-5 text-[10.5px] tracking-[0.22em] text-mint sm:mb-[26px]">
            {BRAND.season} — Ánh sáng ban mai
          </div>
          <KineticHeading
            text="La mer délivre"
            className="m-0 max-w-[14ch] font-display text-[clamp(38px,9vw,132px)] leading-[0.88] tracking-[-0.03em] text-balance"
          />
        </div>

        <div className="border-t border-hair-2">
          <div className="mono-label mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 text-[10.5px] tracking-[0.16em] text-smoke sm:px-6 sm:py-4">
            <span>{BRAND.season} — Sổ mẫu</span>
            <span>Dệt tại Nam Định và Bảo Lộc</span>
            <Link href="/product" className="border-b border-mint pb-1 text-paper">
              Xem bộ sưu tập →
            </Link>
          </div>
        </div>
      </HeroStage>

      <Marquee />

      {/* ------------------------------------------------------- mới về */}
      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-[60px]">
        <Reveal>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3.5 sm:mb-[26px]">
            <h2 className="m-0 font-display text-[clamp(28px,4.4vw,56px)] leading-[0.95] font-bold tracking-[-0.02em]">
              Mới về
            </h2>
            <Link
              href="/product"
              className="mono-label text-[10.5px] tracking-[0.16em] text-smoke transition-colors hover:text-ink"
            >
              Tất cả sản phẩm →
            </Link>
          </div>
        </Reveal>

        <InfiniteSlider label="Sản phẩm mới về">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </InfiniteSlider>
      </section>

      {/* ----------------------------------------------------- tạp chí */}
      <section className="bg-ink px-4 py-12 text-paper sm:px-6 sm:py-[68px]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 md:grid-cols-2 md:gap-11">
          <Reveal>
            <div className="mono-label mb-[18px] text-[11px] tracking-[0.2em] text-chalk-dim">
              Tạp chí {BRAND.name}
            </div>
            <h2 className="m-0 mb-[18px] font-display text-[clamp(26px,3.8vw,46px)] leading-[1.1] font-bold tracking-[-0.01em]">
              Hai bài mỗi tuần, và tên người viết ở cuối mỗi bài
            </h2>
            <p className="m-0 mb-6 max-w-[52ch] text-[15.5px] leading-[1.75] text-chalk">
              Thứ Tư và thứ Bảy. Tin thời trang, phối đồ, grooming, đồng hồ, văn
              hóa. Bài nào cũng có một biên tập viên chịu trách nhiệm cuối, và
              tên người đó nằm dưới tiêu đề.
            </p>
            <Link
              href="/magazine"
              className="inline-block border-b border-mint pb-1 text-[13px] tracking-[0.14em] uppercase"
            >
              Vào tạp chí
            </Link>
          </Reveal>

          <div className="grid gap-3.5">
            {latest.map((a, i) => (
              <Reveal key={a.slug} delay={i * 90}>
                <Link
                  href={`/article/${a.slug}`}
                  className="group flex items-center gap-4 border-t border-hair pt-3.5 text-left"
                >
                  <Image
                    src={a.card}
                    alt={a.title}
                    width={88}
                    height={64}
                    sizes="88px"
                    className="hatch-dark h-16 w-[88px] flex-none object-cover"
                  />
                  <span>
                    <span className="mono-label block text-[10px] tracking-[0.16em] text-mint">
                      {a.rubric}
                    </span>
                    <span className="mt-1.5 block font-display text-[16.5px] leading-[1.3] font-semibold tracking-[-0.015em] transition-colors group-hover:text-mint sm:text-[18.5px]">
                      {a.title}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- big wordmark */}
      <section className="overflow-hidden bg-ink pt-14 text-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-7 px-4 sm:px-6">
          <p className="m-0 max-w-[34ch] text-[15.5px] leading-[1.75] text-chalk">
            Mười bốn mẫu cho cả mùa, dệt tại Nam Định và Bảo Lộc. Tên xưởng in
            trên nhãn áo.
          </p>
          <span className="mono-label text-[10.5px] tracking-[0.2em] text-mint">
            {BRAND.est}
          </span>
        </div>
        <div className="m-0 overflow-hidden px-3 font-display text-[clamp(64px,20vw,300px)] leading-[0.78] font-extrabold tracking-[-0.055em] lowercase whitespace-nowrap">
          {BRAND.name}
        </div>
      </section>

      {/* -------------------------------------------------- giới thiệu */}
      <section className="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 sm:px-6 sm:py-[60px] md:grid-cols-2 md:gap-14">
        <Reveal>
          <div className="mono-label mb-4 text-[11px] text-smoke">Giới thiệu</div>
          <h2 className="m-0 mb-4 font-display text-[clamp(26px,3.8vw,44px)] leading-[1.05] font-bold tracking-[-0.02em]">
            Mười bốn mẫu, bốn xưởng
          </h2>
          <p className="m-0 mb-6 max-w-[46ch] text-base leading-[1.75] text-graphite">
            {BRAND.name} bắt đầu năm 2026. Vải dệt ở Nam Định và Bảo Lộc, tên
            xưởng in trên nhãn từng chiếc áo.
          </p>
          <Link
            href="/about-us"
            className="mono-label border-b border-mint pb-1 text-[10.5px] tracking-[0.14em]"
          >
            Giới thiệu →
          </Link>
        </Reveal>

        {/* Read from the product data rather than retyped, so a workshop name
            cannot say one thing here and another on a label. */}
        <ul className="m-0 grid list-none gap-0 p-0 md:pt-2">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.sku} delay={i * 70}>
              <li className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
                <span className="text-[15px]">{p.maker.workshop}</span>
                <span className="mono-label text-[10px] text-smoke">{p.maker.place}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ maeven by you */}
      <section className="border-t border-line bg-paper-2 py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <Reveal>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3.5">
              <h2 className="m-0 font-display text-[clamp(26px,3.8vw,44px)] leading-[1] font-bold tracking-[-0.02em]">
                {BRAND.name} by you
              </h2>
              <span className="mono-label text-[10.5px] text-smoke">
                {CUSTOMER_POSTS.length} ảnh khách gửi · giữ nguyên chú thích
              </span>
            </div>
          </Reveal>
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <AutoCarousel label="Ảnh khách gửi về">
            {CUSTOMER_POSTS.map((post) => (
              <CustomerCard key={post.id} post={post} ratio="3 / 4" />
            ))}
          </AutoCarousel>
        </div>
      </section>

      {/* ---------------------------------------------------- đọc thêm */}
      <section className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6 sm:pb-24">
        <Reveal>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3.5">
            <h2 className="m-0 font-display text-[clamp(24px,3.4vw,38px)] leading-[1] font-bold tracking-[-0.02em]">
              Đọc thêm
            </h2>
            <Link
              href="/magazine"
              className="mono-label text-[10.5px] tracking-[0.16em] text-smoke transition-colors hover:text-ink"
            >
              Tất cả bài viết →
            </Link>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a, i) => (
            <Reveal key={a.slug} delay={i * 90}>
              <ArticleCard article={a} />
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
