import { BRAND } from "@/lib/constants";

/**
 * Width of the lowercase wordmark per 1em of font-size, at each `wdth` used.
 *
 * Measured in Chrome from the built site (Archivo, wght 800, tracking -0.04em),
 * so `font-size: 100cqw / ratio` makes the word span its container exactly,
 * with no script. HeroStage re-measures at runtime while it animates the axis,
 * so a small drift here only costs a few pixels on the no-JS path.
 */
export const WORDMARK_RATIO = { 75: 2.888, 125: 4.713 } as const;

/**
 * The brand name set edge to edge of its container, in pure CSS.
 *
 * The container is an inline-size query container, so `cqw` is the container's
 * own width (the 12-column content box), not the viewport's. Decorative: the
 * header already names the brand, so this is `aria-hidden`.
 *
 * `data-wordmark` marks the span HeroStage drives (font-stretch + scale).
 */
export default function Wordmark({
  stretch = 75,
  className = "",
}: {
  /** Archivo `wdth` axis, as a font-stretch percentage. */
  stretch?: keyof typeof WORDMARK_RATIO;
  className?: string;
}) {
  return (
    <div aria-hidden className={`@container w-full ${className}`}>
      <span
        data-wordmark
        className="inline-block origin-bottom-left font-display leading-[0.74] font-extrabold tracking-[-0.04em] whitespace-nowrap lowercase"
        style={{
          fontSize: `calc(100cqw / ${WORDMARK_RATIO[stretch]})`,
          fontStretch: `${stretch}%`,
        }}
      >
        {BRAND.name}
      </span>
    </div>
  );
}
