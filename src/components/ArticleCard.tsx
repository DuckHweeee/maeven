import Link from "next/link";
import Photo from "@/components/Photo";
import Tilt from "@/components/motion/Tilt";
import type { Article } from "@/lib/data";

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Tilt fabric={false}>
      <Link href={`/article/${article.slug}`} className="group block text-left">
        <Photo
          src={article.card}
          alt={article.title}
          ratio="3 / 2"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        >
          {/* Weave beneath the photograph, surfacing as the card turns.
              --mag / --px / --py are set by Tilt and inherit down to here. */}
          <span
            aria-hidden
            className="weave pointer-events-none absolute inset-0 opacity-[calc(var(--mag,0)*0.55)] mix-blend-multiply"
            style={{
              maskImage:
                "radial-gradient(130% 130% at var(--px,50%) var(--py,50%), #000 0%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(130% 130% at var(--px,50%) var(--py,50%), #000 0%, transparent 70%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[calc(var(--mag,0)*0.5)]"
            style={{
              background:
                "radial-gradient(55% 55% at var(--px,50%) var(--py,50%), rgba(255,255,255,0.30), transparent 72%)",
            }}
          />
        </Photo>

        <span className="mono-label mt-3.5 block text-[10px] tracking-[0.16em] text-forest">
          {article.rubric}
        </span>
        <span className="mt-2 mb-2.5 block font-display text-[19px] leading-[1.25] font-semibold tracking-[-0.015em] transition-colors group-hover:text-forest sm:text-[21px]">
          {article.title}
        </span>
        <span className="block text-sm leading-[1.7] text-slate">{article.dek}</span>
        <span className="mt-3 block font-mono text-[10px] text-smoke">
          {article.date} · {article.readTime}
        </span>
      </Link>
    </Tilt>
  );
}
