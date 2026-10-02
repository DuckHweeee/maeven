import { BRAND, SITE_URL, priceToNumber } from "./constants";
import type { Article, Product } from "./data";

/**
 * JSON-LD for the article and product routes.
 *
 * Server-only by construction — it is called from page.tsx, never from the
 * client reader, so the graph is in the prerendered HTML rather than assembled
 * after hydration.
 *
 * Every value here must also be visible on the page. Structured data that
 * describes something the reader cannot see is the one way this actively hurts.
 */

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Article dates are written DD.MM.YYYY for readers; schema wants ISO 8601. */
function isoDate(dmy: string) {
  const [d, m, y] = dmy.split(".");
  return y && m && d ? `${y}-${m}-${d}` : dmy;
}

const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}#organization`,
  name: BRAND.name,
  url: SITE_URL,
  slogan: BRAND.tagline,
};

/** The page itself, so nothing in the graph points at an id that is not defined. */
const webPage = (url: string, name: string, extra: Record<string, unknown> = {}) => ({
  "@type": "WebPage",
  "@id": url,
  url,
  name,
  isPartOf: { "@id": organization["@id"] },
  breadcrumb: { "@id": `${url}#breadcrumb` },
  inLanguage: "vi-VN",
  ...extra,
});

type Crumb = { name: string; path: string };

const breadcrumb = (id: string, crumbs: Crumb[]) => ({
  "@type": "BreadcrumbList",
  "@id": id,
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: abs(c.path),
  })),
});

export function articleGraph(article: Article) {
  const url = abs(`/article/${article.slug}`);
  // The byline is a name on a page, nothing more. No sameAs, no jobTitle: this
  // is a fictional masthead and inventing identifiers would assert people exist.
  const author = {
    "@type": "Person",
    "@id": `${url}#author`,
    name: article.author,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: article.title,
        description: article.dek,
        datePublished: isoDate(article.date),
        articleSection: article.rubric,
        inLanguage: "vi-VN",
        author: { "@id": author["@id"] },
        publisher: { "@id": organization["@id"] },
        image: { "@id": `${url}#primaryimage` },
        mainEntityOfPage: { "@id": url },
        // Only claimed where a translation was actually written.
        ...(article.en ? { workTranslation: { "@type": "BlogPosting", inLanguage: "en" } } : {}),
      },
      webPage(url, article.title, { primaryImageOfPage: { "@id": `${url}#primaryimage` } }),
      {
        "@type": "ImageObject",
        "@id": `${url}#primaryimage`,
        url: abs(article.hero),
        caption: article.caption,
      },
      author,
      organization,
      breadcrumb(`${url}#breadcrumb`, [
        { name: "Trang chủ", path: "/" },
        { name: "Tạp chí", path: "/magazine" },
        { name: article.title, path: `/article/${article.slug}` },
      ]),
    ],
  };
}

export function productGraph(product: Product) {
  const url = abs(`/product/${product.sku}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: product.blurb,
        sku: product.sku,
        material: product.material,
        image: product.gallery.map((g) => abs(g.src)),
        brand: { "@id": organization["@id"] },
        mainEntityOfPage: { "@id": url },
        offers: {
          "@type": "Offer",
          url,
          price: priceToNumber(product.price),
          priceCurrency: "VND",
          availability: "https://schema.org/InStock",
        },
      },
      webPage(url, product.name),
      organization,
      breadcrumb(`${url}#breadcrumb`, [
        { name: "Trang chủ", path: "/" },
        { name: "Cửa hàng", path: "/product" },
        { name: product.name, path: `/product/${product.sku}` },
      ]),
    ],
  };
}

/**
 * Serialise for `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` does the encoding — no hand-built JSON — and the two
 * replacements stop any value that happens to contain `</script` from closing
 * the block early. Both escapes are still valid JSON, so parsers are unaffected.
 */
export const ldJson = (graph: unknown) => ({
  __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
});
