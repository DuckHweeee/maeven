"use client";

import { useState } from "react";
import Photo from "@/components/Photo";
import Parallax from "@/components/motion/Parallax";
import Prose from "@/components/Prose";
import ArticleCard from "@/components/ArticleCard";
import ProductCard from "@/components/ProductCard";
import type { Article, Product } from "@/lib/data";

export default function ArticleReader({
  article,
  related,
  products,
}: {
  article: Article;
  related: Article[];
  /**
   * Resolved on the server. Passing the products in rather than importing the
   * lookup here keeps every article body out of the browser bundle — the same
   * reason constants.ts exists.
   */
  products: Product[];
}) {
  const [en, setEn] = useState(false);
  const [summary, setSummary] = useState(true);

  const hasEn = Boolean(article.en);
  const a = en && article.en ? article.en : article;

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <div className="mx-auto max-w-[820px] px-4 pt-10 pb-[22px] sm:px-6 sm:pt-[60px]">
        <div className="mono-label text-[10.5px] text-forest">{a.rubric}</div>
        <h1 className="mt-4 mb-5 font-display text-[clamp(29px,5.2vw,64px)] leading-[1.04] font-bold tracking-[-0.012em]">
          {a.title}
        </h1>
        <p className="m-0 mb-[26px] text-[17px] leading-[1.65] text-graphite sm:text-[19px]">
          {a.dek}
        </p>

        {/* /about-us promises that a piece touching a MAEVEN product says so
            directly under its headline. This is that line — it is a disclosure,
            not a cross-sell, so it sits with the byline and stays plain.
            Deliberately not `.mono-label`: that class uppercases, and a whole
            Vietnamese sentence in caps with 0.18em tracking is hard to read.
            A disclosure that is hard to read is not much of a disclosure. */}
        {products.length > 0 && (
          <p className="m-0 mb-[26px] border-l-2 border-forest pl-3 font-mono text-[11.5px] leading-[1.7] text-graphite">
            {en
              ? `This piece discusses ${products.length === 1 ? "a MAEVEN product" : "MAEVEN products"}.`
              : "Bài này có nhắc đến sản phẩm của MAEVEN."}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-3.5 font-mono text-[10.5px] tracking-[0.1em] text-smoke">
          <span>{article.author}</span>
          <span>{article.date}</span>
          <span>{a.readTime}</span>
          <span>{a.credit}</span>
        </div>

        {summary && (
          <div className="mt-[22px] border border-line-2 bg-panel px-5 py-5 sm:px-[22px]">
            <div className="mono-label mb-3 text-[10px] tracking-[0.16em] text-forest">
              {a.sumHead}
            </div>
            <ul className="m-0 list-disc pl-[18px] text-[15px] leading-[1.75] text-graphite">
              {a.summary.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-[18px] flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSummary((v) => !v)}
            aria-expanded={summary}
            className="mono-label cursor-pointer border border-line-3 px-3.5 py-[9px] text-[10.5px] tracking-[0.12em] text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            {summary
              ? en
                ? "Hide summary"
                : "Ẩn tóm tắt"
              : en
                ? "Show summary"
                : "Tóm tắt"}
          </button>

          {/* Only offered where a translation actually exists. */}
          {hasEn && (
            <button
              type="button"
              onClick={() => setEn((v) => !v)}
              className="mono-label cursor-pointer border border-line-3 px-3.5 py-[9px] text-[10.5px] tracking-[0.12em] text-graphite transition-colors hover:border-ink hover:text-ink"
            >
              {en ? "Đọc tiếng Việt" : "Read in English"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-4 pt-[22px] sm:px-6">
        <Parallax amount={80}>
          <Photo
            src={article.hero}
            alt={a.caption}
            ratio="16 / 9"
            priority
            sizes="(max-width: 1120px) 100vw, 1072px"
          />
        </Parallax>
        <div className="mt-2.5 font-mono text-[10.5px] text-smoke">{a.caption}</div>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-10 pb-16 text-[16.5px] leading-[1.8] text-[#22221f] sm:px-6 sm:pt-[42px] sm:pb-22 sm:text-[17.5px]">
        <Prose blocks={a.body} />
      </div>

      {products.length > 0 && (
        <section className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6 sm:pb-22">
          <h2 className="m-0 mb-[22px] border-t border-ink pt-4 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
            {en ? "Mentioned in this piece" : "Món nhắc trong bài"}
          </h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-line bg-paper-2 px-4 py-12 sm:px-6 sm:py-[52px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mono-label mb-[22px] text-[11px] text-smoke">
            {en ? "Read next" : "Đọc tiếp"}
          </div>
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ArticleCard key={r.slug} article={r} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
