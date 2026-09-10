import Link from "next/link";
import Photo from "@/components/Photo";
import type { Product } from "@/lib/data";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.sku}`} className="group block">
      <Photo
        src={product.gallery[0].src}
        alt={product.gallery[0].alt}
        ratio="3 / 4"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
      >
        <span className="mono-label absolute top-2.5 left-3 z-10 text-[10.5px] tracking-[0.12em] text-paper mix-blend-difference">
          {product.no}
        </span>
      </Photo>
      <div className="mt-3 flex justify-between gap-3 border-t border-ink pt-[11px] text-[14.5px]">
        <span className="transition-colors group-hover:text-forest">{product.name}</span>
        <span className="font-mono text-graphite">{product.price}</span>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-smoke">{product.material}</div>
    </Link>
  );
}
