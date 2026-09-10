"use client";

import { useEffect, useId, useRef, useState } from "react";

const KEY = "maeven.welcome.v1";
const CODE = "MAEVEN15";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Welcome offer for a first order.
 *
 * Deliberately without urgency: it appears once, never returns after it is
 * closed or used, carries no countdown and no scarcity language. The brand's
 * own voice rule is "không hối khách", so the offer states its terms and stops.
 */
export default function WelcomeOffer() {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Eligibility is read once; `visible` only ever flips from a timer or a
  // scroll callback, never synchronously during the effect.
  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(KEY));
    } catch {
      seen = true; // storage blocked — do not nag on every page view
    }
    if (seen) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
      cleanup();
    };

    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.45) reveal();
    };

    const timer = window.setTimeout(reveal, 12000);
    window.addEventListener("scroll", onScroll, { passive: true });

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  const close = (remember: string) => {
    try {
      localStorage.setItem(KEY, remember);
    } catch {
      // Nothing to do; it simply may reappear next session.
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close("dismissed");
      if (e.key !== "Tab") return;

      const f = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!f?.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreTo.current?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setState("error");
      return;
    }
    setState("done");
    try {
      localStorage.setItem(KEY, "joined");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-4 sm:items-center">
      <div
        onClick={() => close("dismissed")}
        aria-hidden
        className="absolute inset-0 bg-ink/45"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="relative w-full max-w-[440px] border border-line bg-paper p-6 shadow-[0_20px_70px_rgba(13,13,12,0.22)] sm:p-8"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => close("dismissed")}
          aria-label="Đóng"
          className="absolute top-3 right-4 cursor-pointer font-mono text-xl leading-none transition-colors hover:text-forest"
        >
          ×
        </button>

        {state === "done" ? (
          <>
            <div className="mono-label text-[10px] text-forest">Đã đăng ký</div>
            <h2
              id={`${id}-title`}
              className="mt-3 mb-3 font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]"
            >
              Mã của bạn
            </h2>
            <p className="m-0 mb-4 text-[15px] leading-[1.7] text-graphite">
              Nhập mã này ở bước thanh toán cho đơn đầu tiên.
            </p>
            <div className="border border-dashed border-ink px-4 py-3 text-center font-mono text-[19px] tracking-[0.18em]">
              {CODE}
            </div>
            <button
              type="button"
              onClick={() => close("joined")}
              className="mt-5 w-full cursor-pointer border border-ink bg-ink px-5 py-3.5 text-[12.5px] tracking-[0.14em] text-paper uppercase transition-colors hover:border-forest hover:bg-forest"
            >
              Bắt đầu xem
            </button>
          </>
        ) : (
          <>
            <div className="mono-label text-[10px] text-forest">Khách mới</div>
            <h2
              id={`${id}-title`}
              className="mt-3 mb-3 font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em]"
            >
              Giảm 15% cho đơn đầu tiên
            </h2>
            <p className="m-0 mb-5 text-[15px] leading-[1.7] text-graphite">
              Tạo tài khoản để nhận mã. Chúng tôi chỉ gửi thư khi có bộ sưu tập
              mới — không quảng cáo, không đếm ngược.
            </p>

            <form onSubmit={submit} noValidate>
              <label htmlFor={`${id}-email`} className="mono-label block text-[10px] text-smoke">
                Email
              </label>
              <input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder="youremail@email.com"
                aria-invalid={state === "error"}
                aria-describedby={state === "error" ? `${id}-err` : undefined}
                className={`mt-2 w-full border bg-panel px-3.5 py-3 text-[15px] outline-none placeholder:text-smoke focus-visible:border-ink ${
                  state === "error" ? "border-forest" : "border-line-3"
                }`}
              />
              {state === "error" && (
                <p id={`${id}-err`} className="mt-2 mb-0 text-[13px] text-forest">
                  Email chưa đúng định dạng.
                </p>
              )}

              <button
                type="submit"
                className="mt-4 w-full cursor-pointer border border-ink bg-ink px-5 py-3.5 text-[12.5px] tracking-[0.14em] text-paper uppercase transition-colors hover:border-forest hover:bg-forest"
              >
                Tạo tài khoản
              </button>
            </form>

            <button
              type="button"
              onClick={() => close("dismissed")}
              className="mono-label mt-4 w-full cursor-pointer text-[10px] text-smoke transition-colors hover:text-ink"
            >
              Để sau
            </button>
          </>
        )}
      </div>
    </div>
  );
}
