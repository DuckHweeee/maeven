import Image from "next/image";
import Link from "next/link";
import Marquee from "@/components/Marquee";
import ArticleCard from "@/components/ArticleCard";
import ProductCard from "@/components/ProductCard";
import Campaign from "@/components/Campaign";
import CustomerCard from "@/components/CustomerCard";
import HeroStage from "@/components/hero/HeroStage";
import GridReveal from "@/components/home/GridReveal";
import SectionHead from "@/components/home/SectionHead";
import UnderlineLink from "@/components/home/UnderlineLink";
import Wordmark from "@/components/home/Wordmark";
import Hairline from "@/components/motion/Hairline";
import Reveal from "@/components/motion/Reveal";
import ScrubWords from "@/components/motion/ScrubWords";
import {
  ARTICLES,
  CUSTOMER_POSTS,
  MARQUEE_ITEMS,
  PRODUCTS,
  WORKSHOPS,
  WORKSHOP_COUNT,
  WORKSHOP_PLACES,
  viCount,
  viList,
} from "@/lib/data";
import { BRAND } from "@/lib/constants";

const pad = (i: number) => String(i + 1).padStart(2, "0");

/** Left edge of the 12-column content box, for rails that bleed to the right. */
const EDGE =
  "[--edge:max(1rem,calc((100vw-1280px)/2+1rem))] sm:[--edge:max(1.5rem,calc((100vw-1280px)/2+1.5rem))]";

export default function HomePage() {
  const latest = ARTICLES.slice(0, 3);
  const more = ARTICLES.slice(3, 6);
  // Counted off the products, never typed out. Every sentence below that names
  // a place or a number of workshops reads it from here, so none of them can go
  // stale behind the list.
  const where = viList(WORKSHOP_PLACES);
  const howMany = viCount(WORKSHOP_COUNT);

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      {/* ---------------------------------------------- 1. hero (signature) */}
      <HeroStage
        src="/img/home/hero-poster.jpg"
        alt="Sổ mẫu SS26 — ánh sáng buổi sớm"
        video
        eyebrow={`${BRAND.season} — Hoạ sắc chiều tà`}
        title="La mer délivre"
        meta={`Làm tại ${where}`}
        cta={{ href: "/product", label: "Xem bộ sưu tập →" }}
      />

      <Marquee items={MARQUEE_ITEMS} />

      {/* ------------------------------------------- 01 sổ mẫu (signature) */}
      <Campaign n={1} />

      {/* ------------------------------------------------------ 02 mới về */}
      <section className="pt-20 pb-24 md:pt-28 md:pb-32">
        <SectionHead
          n={2}
          folio={`Cửa hàng · ${BRAND.season}`}
          title="Mới về"
          link={{ href: "/product", label: "Tất cả sản phẩm →" }}
        />
        {/* Under 768px a swipe rail (two cards abreast crush the caption
            row); 768–1023px two columns; from 1024px four. Four at 768px left
            each card ~150px and wrapped the name word by word. */}
        <GridReveal
          label="Sản phẩm mới về"
          className={`mt-10 flex snap-x snap-mandatory scroll-px-(--edge) gap-(--grid-gutter) overflow-x-auto overscroll-x-contain px-(--edge) pb-4 ${EDGE} md:mt-14 md:grid-12 md:overflow-visible md:pb-0`}
        >
          {PRODUCTS.slice(0, 4).map((p) => (
            <li key={p.sku} className="w-[72vw] flex-none snap-start sm:w-[42vw] md:col-span-6 md:w-auto lg:col-span-3">
              <ProductCard product={p} />
            </li>
          ))}
        </GridReveal>
      </section>

      {/* ------------------------------------------------------ 03 tạp chí */}
      <section className="bg-ink pt-20 pb-16 text-paper md:pt-28 md:pb-24">
        <SectionHead
          n={3}
          folio={`Tạp chí ${BRAND.name}`}
          title="Hai bài mỗi tuần, và tên người viết ở cuối mỗi bài"
          size="headline"
          tone="dark"
          link={{ href: "/magazine", label: "Vào tạp chí →" }}
        />
        <div className="grid-12 mt-10 gap-y-12 md:mt-14">
          <Reveal className="col-span-12 md:col-span-4 md:col-start-4">
            <p className="m-0 max-w-[40ch] text-body text-chalk">
              Thứ Tư và thứ Bảy. Tin thời trang, phối đồ, grooming, đồng hồ, văn hóa. Bài nào cũng
              có một biên tập viên chịu trách nhiệm cuối, và tên người đó nằm dưới tiêu đề.
            </p>
          </Reveal>

          <ol className="col-span-12 m-0 list-none p-0 md:col-span-5 md:col-start-8">
            {latest.map((a, i) => (
              <li key={a.slug}>
                <Hairline className="bg-hair" delay={i * 0.08} />
                <Link
                  href={`/article/${a.slug}`}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-start gap-4 py-5"
                >
                  <span aria-hidden className="pt-0.5 font-mono text-label text-chalk-dim tabular-nums">
                    {pad(i)}
                  </span>
                  <span>
                    <span className="block font-mono text-label text-chalk-dim uppercase">
                      {a.rubric}
                    </span>
                    <span className="relative mt-2 block pb-1.5 text-[1.0625rem] leading-[1.35] font-medium">
                      {a.title}
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                      />
                    </span>
                  </span>
                  <Image
                    src={a.card}
                    alt=""
                    width={72}
                    height={72}
                    sizes="72px"
                    className="hatch-dark aspect-square h-[4.5rem] w-[4.5rem] object-cover"
                  />
                </Link>
              </li>
            ))}
            <li aria-hidden>
              <Hairline className="bg-hair" delay={0.24} />
            </li>
          </ol>
        </div>
      </section>

      {/* ----------------------------------------- wordmark + scrubbed line */}
      <section className="overflow-hidden bg-ink pb-5 text-paper md:pb-8">
        <div className="grid-12 gap-y-6 pt-10 md:pt-20">
          <p className="col-span-12 m-0 font-mono text-label text-chalk-dim uppercase md:col-span-3">
            {BRAND.est}
          </p>
          <ScrubWords className="col-span-12 m-0 text-[clamp(1.75rem,1rem+3vw,4rem)] leading-[1.1] font-semibold tracking-[-0.025em] [font-stretch:87.5%] md:col-span-9">
            {`Mười bốn mẫu cho cả mùa, làm tại ${where}. Tên xưởng in trên nhãn áo.`}
          </ScrubWords>
        </div>
        <div className="grid-12 mt-16 md:mt-28">
          <Wordmark stretch={125} className="col-span-12 text-paper" />
        </div>
      </section>

      {/* ---------------------------------------------- 04 giới thiệu, xưởng */}
      <section className="pt-20 pb-24 md:pt-28 md:pb-32">
        <SectionHead n={4} folio="Giới thiệu" title={`Mười bốn mẫu, ${howMany} xưởng`} />
        <div className="grid-12 mt-10 gap-y-14 md:mt-14">
          <Reveal className="col-span-12 md:col-span-4 md:col-start-4">
            <p className="m-0 mb-7 max-w-[40ch] text-body text-graphite">
              {BRAND.name} bắt đầu năm 2026. Làm ở {howMany} xưởng tại {where}, tên xưởng in trên
              nhãn từng chiếc áo.
            </p>
            <UnderlineLink href="/about-us" className="text-slate">
              Giới thiệu →
            </UnderlineLink>
          </Reveal>

          {/* A three-column table: number, workshop, place. Read from the
              de-duplicated WORKSHOPS list, so its length is the count above. */}
          <div className="col-span-12 md:col-span-5 md:col-start-8">
            <div
              aria-hidden
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-4 pb-3 font-mono text-label text-smoke uppercase"
            >
              <span>Số</span>
              <span>Xưởng</span>
              <span>Nơi</span>
            </div>
            <ol className="m-0 list-none p-0">
              {WORKSHOPS.map((w, i) => (
                <li key={w.workshop}>
                  <Hairline className="bg-ink" delay={i * 0.07} />
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-4 py-4">
                    <span aria-hidden className="font-mono text-label text-smoke tabular-nums">
                      {pad(i)}
                    </span>
                    <span className="text-headline font-semibold [font-stretch:75%]">{w.workshop}</span>
                    <span className="font-mono text-label text-slate uppercase">{w.place}</span>
                  </div>
                </li>
              ))}
              <li aria-hidden>
                <Hairline className="bg-ink" delay={WORKSHOPS.length * 0.07} />
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- 05 maeven by you */}
      <section className={`pb-24 md:pb-32 ${EDGE}`}>
        <SectionHead n={5} folio="Khách gửi về" title={`${BRAND.name} by you`} />
        <div className="grid-12 mt-5">
          <p className="col-span-12 m-0 font-mono text-label text-smoke uppercase md:col-span-9 md:col-start-4">
            {CUSTOMER_POSTS.length} ảnh khách gửi · giữ nguyên chú thích
          </p>
        </div>
        {/* A native horizontal rail: swipe, trackpad, or Tab into it and use
            the arrow keys. Nothing moves on its own. */}
        <div
          role="region"
          aria-label="Ảnh khách gửi về"
          tabIndex={0}
          className="mt-10 snap-x snap-mandatory scroll-px-(--edge) overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin] md:mt-14"
        >
          <ul className="m-0 flex w-max list-none gap-(--grid-gutter) p-0 px-(--edge)">
            {CUSTOMER_POSTS.map((post) => (
              <li
                key={post.id}
                className="w-[72vw] flex-none snap-start sm:w-[42vw] md:w-[calc((min(100vw,1280px)-3rem-11*var(--grid-gutter))/4+2*var(--grid-gutter))]"
              >
                <CustomerCard post={post} ratio="4 / 5" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ 06 đọc thêm */}
      <section className="pb-24 md:pb-32">
        <SectionHead
          n={6}
          folio="Tạp chí"
          title="Đọc thêm"
          link={{ href: "/magazine", label: "Tất cả bài viết →" }}
        />
        <div className="grid-12 mt-10 gap-y-14 md:mt-14">
          {more.map((a) => (
            <div key={a.slug} className="col-span-12 md:col-span-4">
              <ArticleCard article={a} reveal />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
