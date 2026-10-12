const TONE = {
  /** On paper. */
  light: "bg-line",
  /** On ink surfaces. */
  dark: "bg-hair",
  /** Over photography. */
  image: "bg-paper/25",
} as const;

/**
 * The 12-column grid made visible: 13 vertical hairlines, one at each outer
 * edge and one centred in every gutter, aligned with `.grid-12`.
 *
 * Server component, CSS only, `aria-hidden`, hidden below 768px. Absolutely
 * positioned: place it inside a `relative` section. Each line is a
 * `[data-grid-line]` span, so a client parent can animate them (e.g.
 * `gsap.from(scope.querySelectorAll("[data-grid-line]"), { scaleY: 0 })`).
 *
 * @example <section className="relative"><GridLines tone="image" />…</section>
 */
export default function GridLines({
  tone = "light",
  className = "",
}: {
  /** `light` (paper bg, default), `dark` (ink bg) or `image` (over photos). */
  tone?: keyof typeof TONE;
  /** Extra classes on the overlay, e.g. a z-index. */
  className?: string;
}) {
  const line = `absolute inset-y-0 w-px origin-top ${TONE[tone]}`;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 hidden md:block ${className}`}
    >
      <div className="grid-12 h-full">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="relative h-full">
            <span
              data-grid-line
              className={line}
              style={{ left: "calc(var(--grid-gutter) / -2)" }}
            />
            {i === 11 && (
              <span
                data-grid-line
                className={line}
                style={{ right: "calc(var(--grid-gutter) / -2)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
