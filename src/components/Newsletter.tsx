"use client";

import { useId, useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Collection notifications. Front-end only — there is no list behind it yet,
 * so it validates, confirms, and stores nothing.
 */
export default function Newsletter({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState(EMAIL.test(email.trim()) ? "done" : "error");
  };

  if (state === "done") {
    return (
      <p className="m-0 text-[15px] leading-[1.7] text-graphite">
        Đã ghi nhận. Bộ sưu tập mới sẽ được báo trước hai ngày, không có thư nào khác.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={compact ? "" : "max-w-[440px]"}>
      <label htmlFor={id} className="mono-label block text-[10px] text-smoke">
        Email
      </label>

      <div className="mt-2 flex flex-wrap gap-2 sm:flex-nowrap">
        <input
          id={id}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="youremail@email.com"
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? `${id}-err` : undefined}
          className={`min-w-0 flex-1 border bg-panel px-3.5 py-3 text-[15px] placeholder:text-smoke focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            state === "error" ? "border-forest" : "border-slate-2"
          }`}
        />
        <button
          type="submit"
          className="cursor-pointer border border-ink bg-ink px-5 py-3 text-[12.5px] tracking-[0.14em] text-paper uppercase transition-colors hover:border-forest hover:bg-forest"
        >
          Đăng ký
        </button>
      </div>

      {state === "error" && (
        <p id={`${id}-err`} className="mt-2 mb-0 text-[13px] text-forest">
          Email chưa đúng định dạng.
        </p>
      )}
    </form>
  );
}
