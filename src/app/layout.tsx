import type { Metadata } from "next";
import { Archivo, Nunito_Sans, IBM_Plex_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import WelcomeOffer from "@/components/WelcomeOffer";
import { BRAND } from "@/lib/data";
import "./globals.css";

// Loaded as a true variable font (no `weight` list) so the wght and wdth axes
// are animatable — see KineticHeading.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  display: "swap",
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s — ${BRAND.name}`,
  },
  description:
    "Thương hiệu thời trang nam tối giản: mỗi mùa một bộ hẹp, chất liệu tự nhiên, phom dựng vai rõ. Kèm tạp chí lối sống.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${archivo.variable} ${nunito.variable} ${plexMono.variable} h-full antialiased`}
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
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CartDrawer />
        <WelcomeOffer />
      </body>
    </html>
  );
}
