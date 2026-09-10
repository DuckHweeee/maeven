import type { Metadata } from "next";
import Image from "next/image";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = {
  title: "Tín dụng ảnh",
  description: "Nguồn và tác giả của toàn bộ ảnh dùng trên maeven.",
};

type Credit = {
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  alt: string;
};

const entries = Object.entries(credits as Record<string, Credit>).sort(([a], [b]) =>
  a.localeCompare(b),
);

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-24">
      <h1 className="m-0 mb-4 font-display text-[clamp(34px,4.8vw,58px)] font-extrabold tracking-[-0.02em]">
        Tín dụng ảnh
      </h1>
      <p className="m-0 mb-10 max-w-[56ch] text-base leading-[1.75] text-graphite">
        Ảnh minh hoạ lấy từ{" "}
        <a
          href="https://www.pexels.com"
          className="border-b border-mint"
          target="_blank"
          rel="noreferrer"
        >
          Pexels
        </a>{" "}
        theo giấy phép Pexels. Tác giả từng ảnh ghi bên dưới.
      </p>

      <ul className="m-0 grid list-none grid-cols-2 gap-6 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(([path, c]) => (
          <li key={path}>
            <div className="hatch relative aspect-3/2 overflow-hidden">
              <Image src={path} alt={c.alt} fill sizes="260px" className="object-cover" />
            </div>
            <div className="mono-label mt-2.5 text-[10px] tracking-normal normal-case text-smoke">
              {path}
            </div>
            <div className="mt-1 text-sm">
              <a
                href={c.photographerUrl}
                target="_blank"
                rel="noreferrer"
                className="border-b border-line-3 hover:border-ink"
              >
                {c.photographer}
              </a>{" "}
              <a
                href={c.pexelsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-smoke hover:text-ink"
              >
                · Pexels ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
