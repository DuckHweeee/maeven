import Link from "next/link";
import Photo from "@/components/Photo";
import Parallax from "@/components/motion/Parallax";
import Reveal from "@/components/motion/Reveal";
import { CAMPAIGN } from "@/lib/data";

/**
 * The season's lookbook, as a band of four columns that drift past each other.
 *
 * Why the columns are offset and drift at four different rates: four squares in
 * a flush row read as a contact sheet. The offsets break the shared baseline so
 * the eye travels rather than scans, and the per-look `drift` means the
 * columns separate further as the band passes — the thing a printed lookbook
 * can never do.
 *
 * Ground is `sand`, not `ink`. Every frame here is high-key — cream cloth,
 * pale concrete — and a dark band would make them fight it. The page already
 * has two ink sections below; this one is the light pause before them.
 *
 * The images are square. The frame is 4/5, so `object-cover` crops the sides
 * and keeps every figure head to toe — the one crop a full-length shot can take
 * without losing its subject.
 *
 * No product links, by design. See the note on `CAMPAIGN` in data.ts: these are
 * campaign frames, and pointing one at a code would have the site assert
 * something the photograph was never lit to say.
 */
export default function Campaign() {
  return (
    <section className="border-y border-line bg-sand py-12 sm:py-[72px]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <Reveal>
          <div className="mb-8 sm:mb-12">
            <div className="mono-label mb-4 text-[10.5px] tracking-[0.2em] text-slate-2">
              Sổ mẫu {CAMPAIGN.season}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b border-ink pb-4">
              <h2 className="m-0 max-w-[13ch] font-display text-[clamp(30px,5.6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-balance">
                {CAMPAIGN.title}
              </h2>
              <Link
                href="/product"
                className="mono-label pb-1 text-[10.5px] tracking-[0.16em] text-slate transition-colors hover:text-ink"
              >
                Xem bộ sưu tập →
              </Link>
            </div>
          </div>
        </Reveal>

        {/* The offsets are top margins rather than grid row spans so the columns
            keep a single flow on a narrow screen and simply stagger. */}
        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {CAMPAIGN.looks.map((look, i) => (
            <li
              key={look.id}
              className={i % 2 === 1 ? "mt-8 sm:mt-14 lg:mt-20" : undefined}
            >
              <Parallax amount={look.drift}>
                <Photo
                  src={look.src}
                  alt={look.alt}
                  ratio="4 / 5"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 45vw, 300px"
                />
              </Parallax>
              <div className="mt-3 flex items-baseline gap-3 border-t border-line-3 pt-2.5">
                <span className="mono-label text-[10px] text-smoke">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13.5px] leading-[1.5] text-slate">{look.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
