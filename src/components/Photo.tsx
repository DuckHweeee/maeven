import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  /** CSS aspect-ratio, e.g. "3 / 4". */
  ratio: string;
  /** Passed straight to next/image so the browser picks a sane source width. */
  sizes?: string;
  className?: string;
  priority?: boolean;
  dark?: boolean;
  children?: React.ReactNode;
};

/**
 * Fixed-ratio photo frame. The hatch ground shows through while the image
 * loads and behind any letterboxing, matching the design's placeholder fill.
 */
export default function Photo({
  src,
  alt,
  ratio,
  sizes = "100vw",
  className = "",
  priority = false,
  dark = false,
  children,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${dark ? "hatch-dark" : "hatch"} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      {children}
    </div>
  );
}
