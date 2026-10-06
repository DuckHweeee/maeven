import Link from "next/link";
import ImageReveal from "@/components/motion/ImageReveal";
import { getProduct, type CustomerPost } from "@/lib/data";

/**
 * A customer's photograph with their own caption, unedited. Flat: no tilt, no
 * sheen. The frame wipes in on scroll (ImageReveal); reduced motion shows it.
 */
export default function CustomerCard({
  post,
  ratio,
}: {
  post: CustomerPost;
  /** Override the post's own ratio — a rail wants one uniform height. */
  ratio?: string;
}) {
  const product = post.sku ? getProduct(post.sku) : undefined;

  return (
    <figure className="m-0">
      <ImageReveal
        src={post.img}
        alt={post.alt}
        ratio={ratio ?? post.ratio}
        sizes="(max-width: 768px) 72vw, 300px"
      />

      <figcaption className="mt-3.5">
        <p className="m-0 text-[14.5px] leading-[1.65] text-graphite">{post.note}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] text-smoke uppercase">
          <span className="text-ink">{post.name}</span>
          <span aria-hidden>·</span>
          <span>{post.city}</span>
          <span aria-hidden>·</span>
          <span>{post.date}</span>
        </div>

        {product && (
          <Link
            href={`/product/${product.sku}`}
            className="group/u relative mt-2.5 inline-flex items-center gap-2 pb-1 font-mono text-[10px] tracking-[0.14em] text-graphite uppercase"
          >
            {product.name}
            {post.size && <span className="text-smoke">· size {post.size}</span>}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line-3" />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/u:scale-x-100 group-focus-visible/u:scale-x-100 motion-reduce:transition-none"
            />
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
