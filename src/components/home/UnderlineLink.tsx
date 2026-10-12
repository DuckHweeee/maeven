import Link from "next/link";

/**
 * Mono text link whose underline draws left → right (scaleX) on hover and on
 * keyboard focus. A faint resting rule keeps it legible as a link before any
 * pointer arrives. CSS only, so it works before hydration; reduced motion
 * drops the transition and the rule simply appears.
 */
export default function UnderlineLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group/u relative inline-block pb-1.5 font-mono text-label uppercase ${className}`}
    >
      {children}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-current opacity-25" />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-current transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/u:scale-x-100 group-focus-visible/u:scale-x-100 motion-reduce:transition-none"
      />
    </Link>
  );
}
