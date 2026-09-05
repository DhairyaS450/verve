import clsx from "clsx";

/** Vero — the raven. Geometric silhouette, single eye. Inherits currentColor. */
export function VeroMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={clsx("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 15C5.5 6.5 11 3.5 15.5 3.5C18.5 3.5 20.5 5 22 6.5L31 11.5L21.5 13.2C21.6 19.5 19 24 14.5 26L13.8 29.5H11.6L11.4 26.6C7.5 25 5.5 21 5.5 15Z"
        fill="currentColor"
      />
      <circle cx="13.2" cy="10.6" r="1.9" fill="var(--paper)" />
    </svg>
  );
}

/** Vero says one line. ≤ 14 words, always. */
export function VeroLine({ children, className, muted }: { children: React.ReactNode; className?: string; muted?: boolean }) {
  return (
    <div className={clsx("flex items-start gap-3", className)}>
      <VeroMark size={22} className={clsx("mt-[2px]", muted ? "text-ink-3" : "text-ink")} />
      <p className={clsx("font-display text-[17px] leading-snug", muted ? "text-ink-2" : "text-ink")}>{children}</p>
    </div>
  );
}
