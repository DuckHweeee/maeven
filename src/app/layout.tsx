import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import CartProvider from "@/store/CartProvider";
import WelcomeOffer from "@/components/WelcomeOffer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import SkipLink from "@/components/SkipLink";
import { BRAND } from "@/lib/data";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

// Loaded as a true variable font (no `weight` list) so the wght and wdth axes
// are animatable — see KineticHeading. Archivo is both the body face (wdth 100,
// wght 400, set in globals.css) and the display face; Nunito Sans is gone.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  display: "swap",
});

const DESCRIPTION =
  "Thương hiệu thời trang nam tối giản: mỗi mùa một bộ hẹp, chất liệu tự nhiên, phom dựng vai rõ. Kèm tạp chí lối sống.";

export const metadata: Metadata = {
  // Without this every canonical and og:image stays relative, which is the same
  // as not having them — both require an absolute URL.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s — ${BRAND.name}`,
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: "vi_VN",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/img/home/hero.jpg", width: 1200, height: 750 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/* Extensions (Grammarly, ColorZilla and friends) stamp attributes onto
          <body> before React hydrates, which React reports as a tree-hydration
          mismatch pointing at this file. This suppresses the diff for this one
          element's own attributes only — one level deep, so a genuine mismatch
          anywhere inside still surfaces. */}
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-paper text-ink"
      >
        <SkipLink />
        <CartProvider>
          {/* Fixed layers stay outside the smoother: anything position:fixed
              inside #smooth-content would scroll away with the transform. */}
          <SiteHeader />
          <SmoothScroll>
            {/* Clears the fixed header. A full-bleed hero that should sit
                under the header pulls itself up with -mt-(--header-h). */}
            <div className="flex-1 pt-(--header-h)">{children}</div>
            <SiteFooter />
          </SmoothScroll>
          <CartDrawer />
        </CartProvider>
        <WelcomeOffer />
      </body>
    </html>
  );
}
