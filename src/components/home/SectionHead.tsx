import Hairline from "@/components/motion/Hairline";
import SplitReveal from "@/components/motion/SplitReveal";
import UnderlineLink from "./UnderlineLink";

/** `01 / Mới về` — index and name, mono, no ornament. */
export function Folio({
  n,
  children,
  className = "text-smoke",
}: {
  n: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`m-0 font-mono text-label uppercase ${className}`}>
      <span className="tabular-nums">{String(n).padStart(2, "0")}</span>
      <span aria-hidden> / </span>
      <span className="sr-only">, </span>
      {children}
    </p>
  );
}

/**
 * Section opener on the 12-column grid: folio in columns 1–3, a line-masked
 * heading from column 4, an optional link pushed to the right edge, and a rule
 * that draws itself underneath.
 *
 * `size="display"` is for one- or two-word titles (condensed, up to 9rem);
 * `headline` for sentences. There is no size in between, on purpose.
 */
export default function SectionHead({
  n,
  folio,
  title,
  link,
  size = "display",
  tone = "light",
  id,
}: {
  n: number;
  folio: string;
  title: string;
  link?: { href: string; label: string };
  size?: "display" | "headline";
  tone?: "light" | "dark";
  id?: string;
}) {
  const dark = tone === "dark";
  return (
    <header className="grid-12 gap-y-5">
      <Folio
        n={n}
        className={`col-span-12 self-start md:col-span-3 ${dark ? "text-chalk-dim" : "text-smoke"}`}
      >
        {folio}
      </Folio>
      <SplitReveal
        as="h2"
        id={id}
        className={`col-span-12 m-0 font-bold [font-stretch:75%] text-balance ${link ? "md:col-span-6" : "md:col-span-9"} ${
          size === "display" ? "text-display" : "text-headline"
        }`}
      >
        {title}
      </SplitReveal>
      {link && (
        // Three columns: in two, "Tất cả sản phẩm →" broke over two lines.
        <div className="col-span-12 self-end md:col-span-3 md:justify-self-end">
          <UnderlineLink href={link.href} className={dark ? "text-chalk" : "text-slate"}>
            {link.label}
          </UnderlineLink>
        </div>
      )}
      <div className="col-span-12 pt-3 md:pt-5">
        <Hairline className={dark ? "bg-hair" : "bg-ink"} />
      </div>
    </header>
  );
}
