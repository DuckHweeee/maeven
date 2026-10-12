import Link from "next/link";
import Photo from "@/components/Photo";
import ImageReveal from "@/components/motion/ImageReveal";
import type { Article } from "@/lib/data";

const SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px";
/** Hover / focus: the photograph settles in by 3% (motion-safe only). */
const IMG_HOVER =
  "[&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:[&_img]:scale-[1.03] motion-safe:group-focus-visible:[&_img]:scale-[1.03]";
/** Same, on the frame instead of the <img>: ImageReveal tweens the img's own
    transform, and a CSS transition on that property would fight the tween. */
const FRAME_HOVER =
  "transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-visible:scale-[1.03]";

/**
 * Flat article card: 3:2 frame, mono rubric, title, dek, date.
 *
 * Hover and keyboard focus scale the image 1.03 and draw a rule under the
 * title (scaleX from the left). No tilt. Pure CSS, so it stays a server
 * component everywhere it is used.
 *
 * `reveal` swaps the frame for an `ImageReveal` mask wipe; the home page opts
 * in, other routes keep the plain frame.
 */
export default function ArticleCard({
  article,
  reveal = false,
}: {
  article: Article;
  reveal?: boolean;
}) {
  return (
    <Link href={`/article/${article.slug}`} className="group block text-left">
      {reveal ? (
        <ImageReveal
          src={article.card}
          alt={article.title}
          ratio="3 / 2"
          sizes={SIZES}
          className="overflow-hidden"
          photoClassName={FRAME_HOVER}
        />
      ) : (
        <Photo src={article.card} alt={article.title} ratio="3 / 2" sizes={SIZES} className={IMG_HOVER} />
      )}

      <span className="mt-3.5 block font-mono text-label text-smoke uppercase">{article.rubric}</span>
      <span className="relative mt-2 mb-2.5 block pb-1 font-display text-[19px] leading-[1.25] font-semibold tracking-[-0.015em] sm:text-[21px]">
        {article.title}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
        />
      </span>
      <span className="block text-sm leading-[1.7] text-slate">{article.dek}</span>
      <span className="mt-3 block font-mono text-[10px] text-smoke">
        {article.date} · {article.readTime}
      </span>
    </Link>
  );
}
