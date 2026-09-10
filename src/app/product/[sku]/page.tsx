import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import ProductCard from "@/components/ProductCard";
import BuyPanel from "./BuyPanel";
import { PRODUCTS, getProduct } from "@/lib/data";

type Params = { params: Promise<{ sku: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ sku: p.sku }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) return {};
  return { title: product.name, description: product.blurb };
}

export default async function ProductPage({ params }: Params) {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) notFound();

  const [hero, ...thumbs] = product.gallery;
  const alsoWear = PRODUCTS.filter((p) => p.sku !== sku);

  return (
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
  );
}
