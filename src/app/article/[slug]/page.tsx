import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleReader from "./ArticleReader";
import { ARTICLES, getArticle, productsForArticle, relatedArticles } from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return { title: article.title, description: article.dek };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <ArticleReader
      article={article}
      related={relatedArticles(slug)}
      products={productsForArticle(article)}
    />
  );
}
