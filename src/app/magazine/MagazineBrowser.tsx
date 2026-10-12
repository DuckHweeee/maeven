"use client";

import { useState } from "react";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import Photo from "@/components/Photo";
import { ARTICLES, RUBRICS } from "@/lib/data";

export default function MagazineBrowser() {
  const [rubric, setRubric] = useState("Tất cả");

  const all = rubric === "Tất cả" ? ARTICLES : ARTICLES.filter((a) => a.rubric === rubric);
  const [feature, ...rest] = all;

  return (
    <main id="main" tabIndex={-1} className="mx-auto outline-none max-w-[1280px] px-4 pt-8 pb-16 sm:px-6 sm:pt-11 sm:pb-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-5">
        <h1 className="m-0 font-display text-[clamp(30px,4.8vw,58px)] font-extrabold tracking-[-0.01em]">
          Tạp chí
        </h1>

        {/* Scrolls sideways on a phone rather than wrapping into four rows. */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          role="group"
          aria-label="Lọc theo chuyên mục"
        >
          {RUBRICS.map((label) => {
            const on = rubric === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRubric(label)}
                aria-pressed={on}
                className={`mono-label flex-none cursor-pointer border px-3.5 py-2 text-[10.5px] tracking-[0.14em] transition-colors hover:border-ink ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-line-3 bg-transparent text-[#333331]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {feature && (
        <article className="grid items-center gap-7 border-b border-line py-8 md:grid-cols-2 md:gap-9 md:py-10">
          <Photo
            src={feature.card}
            alt={feature.title}
            ratio="4 / 3"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div>
            <div className="mono-label text-[10.5px] text-forest">
              {feature.rubric} · {feature.readTime}
            </div>
            <h2 className="mt-3.5 mb-4 font-display text-[clamp(25px,3.6vw,44px)] leading-[1.08] font-bold tracking-[-0.01em]">
              {feature.title}
            </h2>
            <p className="m-0 mb-5 max-w-[56ch] text-base leading-[1.75] text-graphite">
              {feature.dek}
            </p>
            <Link
              href={`/article/${feature.slug}`}
              className="inline-block border border-ink px-6 py-[13px] text-[12.5px] tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper"
            >
              Đọc bài
            </Link>
          </div>
        </article>
      )}

      <div className="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-2 sm:pt-10 lg:grid-cols-3">
        {rest.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>

      {all.length === 0 && (
        <p className="mono-label py-16 text-center text-smoke">
          Chưa có bài trong chuyên mục này.
        </p>
      )}
    </main>
  );
}
