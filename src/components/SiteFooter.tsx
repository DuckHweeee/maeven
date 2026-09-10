import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import { BRAND, NAV } from "@/lib/data";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="m-0 mb-3 font-display text-[clamp(22px,2.6vw,30px)] leading-[1.15] font-bold tracking-[-0.02em]">
            Bộ sưu tập mới, báo trước hai ngày
          </h2>
          <p className="m-0 max-w-[46ch] text-[15px] leading-[1.7] text-graphite">
            Mỗi mùa một thư, gửi trước ngày mở bán hai ngày. Nội dung là mẫu mới
            và những món đã hết được dệt lại. Không có gì khác.
          </p>
        </div>
        <div className="md:pt-1">
          <Newsletter />
        </div>
      </div>

      <div className="border-t border-line px-4 py-8 sm:px-6 sm:py-[30px]">
      <div className="mono-label mx-auto flex max-w-[1280px] flex-col gap-4 tracking-[0.12em] text-smoke sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span>
          {BRAND.name} — {BRAND.tagline}
        </span>

        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {NAV.filter((t) => t.href !== "/").map((t) => (
            <Link key={t.href} href={t.href} className="hover:text-ink">
              {t.label}
            </Link>
          ))}
          <Link href="/credits" className="hover:text-ink">
            Tín dụng ảnh
          </Link>
        </nav>

        <span>{BRAND.est}</span>
      </div>
      </div>
    </footer>
  );
}
