import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ArticleCard from "@/components/ArticleCard";
import GridLines from "@/components/motion/GridLines";
import Hairline from "@/components/motion/Hairline";
import ImageReveal from "@/components/motion/ImageReveal";
import SplitReveal from "@/components/motion/SplitReveal";
import { ldJson, productGraph } from "@/lib/schema";
import BuyPanel from "./BuyPanel";
import ProductStage from "./ProductStage";
import { PRODUCTS, articlesForProduct, getProduct } from "@/lib/data";

type Params = { params: Promise<{ sku: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ sku: p.sku }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) return {};
  const url = `/product/${product.sku}`;
  return {
    title: product.name,
    description: product.blurb,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: product.name,
      description: product.blurb,
      images: [{ url: product.gallery[0].src, alt: product.gallery[0].alt }],
    },
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Section head on the grid: rule, mono folio in cols 1–3, condensed title from col 4. */
function SectionHead({ folio, id, children }: { folio: string; id: string; children: React.ReactNode }) {
  return (
    <>
      <div className="col-span-12">
        <Hairline className="bg-ink" />
      </div>
      <p className="col-span-12 mt-4 mb-0 font-mono text-label text-smoke uppercase md:col-span-3">
        {folio}
      </p>
      <SplitReveal
        as="h2"
        id={id}
        className="col-span-12 mt-6 mb-0 text-headline font-semibold [font-stretch:75%] md:col-span-9 md:col-start-4 md:mt-3"
      >
        {children}
      </SplitReveal>
    </>
  );
}

export default async function ProductPage({ params }: Params) {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) notFound();

  // Three, so the row is never ragged however many products the catalogue grows to.
  const alsoWear = PRODUCTS.filter((p) => p.sku !== sku).slice(0, 3);
  const written = articlesForProduct(sku);
  const total = pad(product.gallery.length);

  // Mobile: a horizontal swipe strip bleeding to the screen edges.
  // Desktop: the frames stack down seven columns.
  // Focusable, so a keyboard can scroll the strip with the arrow keys (it holds
  // no links of its own). It stays a list — role="region" on the <ul> would
  // orphan its <li>s — and is named for screen readers by aria-label.
  const gallery = (
    <ul
      aria-label="Ảnh sản phẩm"
      tabIndex={0}
      className="-mx-4 my-0 flex focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink list-none snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:snap-none md:gap-(--grid-gutter) md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {product.gallery.map((img, i) => (
        <li key={img.src} className="w-[84%] shrink-0 snap-start md:w-auto">
          <ImageReveal
            src={img.src}
            alt={img.alt}
            ratio="4 / 5"
            from="bottom"
            trigger={i === 0 ? "load" : "scroll"}
            priority={i === 0}
            sizes="(max-width: 768px) 84vw, 58vw"
          />
          <p aria-hidden className="mt-2 mb-0 font-mono text-label tracking-normal text-smoke tabular-nums">
            {pad(i + 1)} / {total}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Prerendered, not injected after hydration. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ldJson(productGraph(product))}
      />
      <main id="main" tabIndex={-1} className="relative pb-20 outline-none sm:pb-28">
        <GridLines />

        <nav aria-label="Vị trí" className="relative grid-12 pt-6 pb-6 sm:pt-8 sm:pb-8">
          <p className="col-span-12 m-0 font-mono text-label text-smoke uppercase">
            <Link href="/product" className="transition-colors hover:text-ink">
              Cửa hàng
            </Link>{" "}
            / {product.no}
          </p>
        </nav>

        <div className="relative">
          <ProductStage gallery={gallery} panel={<BuyPanel product={product} />} />
        </div>

        {/* The workshop — what the shop card's back used to tell. */}
        <section aria-labelledby="maker-title" className="relative grid-12 mt-24 sm:mt-36">
          <SectionHead folio="02 / Xưởng dệt" id="maker-title">
            {product.maker.workshop}
          </SectionHead>
          <p className="col-span-12 mt-3 mb-0 font-mono text-label text-smoke uppercase md:col-span-9 md:col-start-4">
            {product.maker.place}
          </p>
          <p className="col-span-12 mt-6 mb-0 max-w-[60ch] text-body text-graphite md:col-span-6 md:col-start-4">
            {product.maker.story}
          </p>
        </section>

        {/* Derived from the articles, so an editor only ever links in one
            direction and this side keeps itself current. */}
        {written.length > 0 && (
          <section aria-labelledby="written-title" className="relative grid-12 mt-24 sm:mt-36">
            <SectionHead folio="03 / Tạp chí" id="written-title">
              Tạp chí viết về món này
            </SectionHead>
            <div className="col-span-12 mt-10 grid gap-x-(--grid-gutter) gap-y-10 sm:grid-cols-2 md:col-span-9 md:col-start-4 md:grid-cols-3">
              {written.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="also-title" className="relative grid-12 mt-24 sm:mt-36">
          <SectionHead folio={`${written.length > 0 ? "04" : "03"} / Mặc cùng`} id="also-title">
            Mặc cùng
          </SectionHead>
          <ul className="col-span-12 -mx-4 mt-10 mb-0 flex list-none snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:col-span-9 md:col-start-4 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-(--grid-gutter) md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {alsoWear.map((p) => (
              <li key={p.sku} className="w-[68%] shrink-0 snap-start md:w-auto">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
