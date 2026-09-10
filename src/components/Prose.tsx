import type { Block } from "@/lib/data";

/** Renders an article body from its structured blocks. */
export default function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "h2") {
          return (
            <h2
              key={i}
              className="mt-9 mb-4 font-display text-[25px] leading-[1.2] font-semibold tracking-[-0.02em] sm:text-[29px]"
            >
              {b.text}
            </h2>
          );
        }
        if (b.t === "quote") {
          return (
            <blockquote key={i} className="my-8 border-l-2 border-mint pl-5 sm:pl-6">
              <p className="m-0 font-display text-[22px] leading-[1.4] font-medium text-ink sm:text-[26px]">
                {b.text}
              </p>
              <span className="mono-label mt-3.5 block text-[10.5px] tracking-[0.14em] text-smoke">
                {b.by}
              </span>
            </blockquote>
          );
        }
        return (
          <p key={i} className="m-0 mb-[22px]">
            {b.text}
          </p>
        );
      })}
    </>
  );
}
