import { MARQUEE_ITEMS } from "@/lib/data";

export default function Marquee() {
  // The list is rendered twice so the -50% keyframe loops seamlessly.
  const run = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="mono-label overflow-hidden whitespace-nowrap bg-mint py-[11px] tracking-[0.24em] text-ink">
      <div className="inline-block animate-marquee motion-reduce:animate-none">
        {run.map((item, i) => (
          <span key={i}>
            {item}
            <span className="px-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
