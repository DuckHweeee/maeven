import type { Metadata } from "next";
import Image from "next/image";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = {
  title: "Tín dụng ảnh",
  description: "Nguồn và tác giả của toàn bộ ảnh dùng trên maeven.",
};

/**
 * Two kinds of image live on this site and they cannot be credited the same way.
 *
 * A stock photograph has a person who took it and a licence that says what we
 * may do with it — so it gets a name and two links. An image we generated has
 * neither: no photographer exists to name, and linking one would invent a
 * person. Rather than fill those fields with something plausible, the type makes
 * them optional and the page splits into two lists with two different sentences.
 *
 * The alternative — one list, one sentence saying everything came from Pexels
 * and Unsplash — would be false the moment the first generated image shipped.
 */
type Credit = {
  photographer?: string;
  photographerUrl?: string;
  source: string;
  sourceUrl?: string;
  /** Present on generated images: what made it. */
  tool?: string;
  alt: string;
  /** Anything a reader needs to know that the path does not say. */
  note?: string;
};

const entries = Object.entries(credits as Record<string, Credit>).sort(([a], [b]) =>
  a.localeCompare(b),
);

const licensed = entries.filter(([, c]) => c.photographer);
const inHouse = entries.filter(([, c]) => !c.photographer);

const SOURCE_HOME: Record<string, string> = {
  Pexels: "https://www.pexels.com",
  Unsplash: "https://unsplash.com",
};

// Derived from the credits file rather than hard-coded, so adding a provider to
// the fetcher never leaves this page claiming the wrong licence.
const sources = [...new Set(licensed.map(([, c]) => c.source))].sort();

function Grid({ items }: { items: [string, Credit][] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-6 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(([path, c]) => (
        <li key={path}>
          <div className="hatch relative aspect-3/2 overflow-hidden">
            <Image src={path} alt={c.alt} fill sizes="260px" className="object-cover" />
          </div>
          {/* File paths have no spaces to break at, so at 320px one of them
              pushed the document 14px wider than the viewport. */}
          <div className="mono-label mt-2.5 text-[10px] tracking-normal normal-case break-all text-smoke">
            {path}
          </div>
          <div className="mt-1 text-sm">
            {c.photographer ? (
              <>
                <a
                  href={c.photographerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-b border-line-3 hover:border-ink"
                >
                  {c.photographer}
                </a>{" "}
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] text-smoke hover:text-ink"
                >
                  · {c.source} ↗
                </a>
              </>
            ) : (
              <span className="font-mono text-[10px] text-smoke">
                {c.source}
                {c.tool && ` · ${c.tool}`}
              </span>
            )}
          </div>
          {c.note && (
            <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-smoke">{c.note}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-24">
      <h1 className="m-0 mb-4 font-display text-[clamp(34px,4.8vw,58px)] font-extrabold tracking-[-0.02em]">
        Tín dụng ảnh
      </h1>
      <p className="m-0 mb-12 max-w-[56ch] text-base leading-[1.75] text-graphite">
        Ảnh trên trang này đến từ hai nơi: ảnh chụp có giấy phép, và ảnh chúng
        tôi tự dựng. Hai nhóm ghi riêng bên dưới, vì chỉ nhóm thứ nhất có tác giả
        để ghi tên.
      </p>

      <h2 className="m-0 mb-3 font-display text-[clamp(20px,2.6vw,28px)] font-bold tracking-[-0.015em]">
        Ảnh chụp có giấy phép
      </h2>
      <p className="m-0 mb-7 max-w-[56ch] text-[15px] leading-[1.7] text-graphite">
        Lấy từ{" "}
        {sources.map((name, i) => (
          <span key={name}>
            {i > 0 && (i === sources.length - 1 ? " và " : ", ")}
            <a
              href={SOURCE_HOME[name] ?? "#"}
              className="border-b border-mint"
              target="_blank"
              rel="noreferrer"
            >
              {name}
            </a>
          </span>
        ))}
        , theo giấy phép của từng nơi. Tên người chụp ghi dưới mỗi ảnh.
      </p>
      <Grid items={licensed} />

      {inHouse.length > 0 && (
        <>
          <h2 className="m-0 mt-16 mb-3 font-display text-[clamp(20px,2.6vw,28px)] font-bold tracking-[-0.015em]">
            Ảnh tự dựng
          </h2>
          <p className="m-0 mb-7 max-w-[56ch] text-[15px] leading-[1.7] text-graphite">
            {inHouse.length} ảnh dưới đây do chúng tôi dựng bằng công cụ AI, không
            phải ảnh chụp. Không có nhiếp ảnh gia nào đứng sau chúng, nên không có
            tên nào để ghi — và người trong ảnh không phải người thật.
          </p>
          <Grid items={inHouse} />
        </>
      )}
    </main>
  );
}
