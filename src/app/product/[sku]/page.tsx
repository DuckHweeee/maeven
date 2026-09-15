import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import ProductCard from "@/components/ProductCard";
import ArticleCard from "@/components/ArticleCard";
import { ldJson, productGraph } from "@/lib/schema";
import BuyPanel from "./BuyPanel";
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

export default async function ProductPage({ params }: Params) {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) notFound();

  const [hero, ...thumbs] = product.gallery;
  // Three, so the row is never ragged however many products the catalogue grows to.
  const alsoWear = PRODUCTS.filter((p) => p.sku !== sku).slice(0, 3);
  const written = articlesForProduct(sku);

  return (
    <>
      {/* Prerendered, not injected after hydration. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ldJson(productGraph(product))}
      />
      <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-16 sm:px-6 sm:pt-11 sm:pb-24">
        <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
          <div className="grid gap-3">
            <Photo
              src={hero.src}
              alt={hero.alt}
              ratio="4 / 5"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="grid grid-cols-3 gap-3">
              {thumbs.map((t) => (
                <Photo key={t.src} src={t.src} alt={t.alt} ratio="1 / 1" sizes="200px" />
              ))}
            </div>
          </div>

          <BuyPanel product={product} />
        </div>

        {/* Derived from the articles, so an editor only ever links in one
            direction and this side keeps itself current. */}
        {written.length > 0 && (
          <section className="mt-16">
            <h2 className="m-0 mb-[22px] font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
              Tạp chí viết về món này
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {written.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-16">
          <h2 className="m-0 mb-[22px] font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
            Mặc cùng
          </h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
            {alsoWear.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
