import Link from "next/link";
import Photo from "@/components/Photo";
import Tilt from "@/components/motion/Tilt";
import { getProduct, type CustomerPost } from "@/lib/data";

export default function CustomerCard({
  post,
  ratio,
}: {
  post: CustomerPost;
  /** Override the post's own ratio — the carousel wants one uniform height. */
  ratio?: string;
}) {
  const product = post.sku ? getProduct(post.sku) : undefined;

  return (
    <figure className="m-0">
      <Tilt fabric={false}>
        <Photo
          src={post.img}
          alt={post.alt}
          ratio={ratio ?? post.ratio}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        >
          <span
            aria-hidden
            className="weave pointer-events-none absolute inset-0 opacity-[calc(var(--mag,0)*0.5)] mix-blend-multiply"
            style={{
              maskImage:
                "radial-gradient(130% 130% at var(--px,50%) var(--py,50%), #000 0%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(130% 130% at var(--px,50%) var(--py,50%), #000 0%, transparent 70%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[calc(var(--mag,0)*0.45)]"
            style={{
              background:
                "radial-gradient(55% 55% at var(--px,50%) var(--py,50%), rgba(255,255,255,0.28), transparent 72%)",
            }}
          />
        </Photo>
      </Tilt>

      <figcaption className="mt-3.5">
        <p className="m-0 text-[14.5px] leading-[1.65] text-graphite">{post.note}</p>

        <div className="mono-label mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-smoke">
          <span className="text-ink">{post.name}</span>
          <span aria-hidden>·</span>
          <span>{post.city}</span>
          <span aria-hidden>·</span>
          <span>{post.date}</span>
        </div>

        {product && (
          <Link
            href={`/product/${product.sku}`}
            className="mono-label mt-2.5 inline-flex items-center gap-2 border-b border-line-3 pb-1 text-[10px] tracking-[0.14em] text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            {product.name}
            {post.size && <span className="text-smoke">· size {post.size}</span>}
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
