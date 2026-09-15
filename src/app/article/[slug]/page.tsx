import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleReader from "./ArticleReader";
import { ARTICLES, getArticle, productsForArticle, relatedArticles } from "@/lib/data";
import { articleGraph, ldJson } from "@/lib/schema";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const url = `/article/${article.slug}`;
  return {
    title: article.title,
    description: article.dek,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.dek,
      publishedTime: article.date.split(".").reverse().join("-"),
      authors: [article.author],
      section: article.rubric,
      images: [{ url: article.hero, alt: article.caption }],
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <>
      {/* Rendered here, not in the client reader, so it is in the prerendered
          HTML rather than assembled after hydration. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(articleGraph(article))} />
      <ArticleReader
        article={article}
        related={relatedArticles(slug)}
        products={productsForArticle(article)}
      />
    </>
  );
}
