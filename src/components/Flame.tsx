import clsx from "clsx";

export type FlameState = "cold" | "lit" | "hot";

/** Streak flame. Geometric, two-tone: ink body, paper core. Hot streaks burn red. */
export function Flame({ size = 22, state = "lit", className }: { size?: number; state?: FlameState; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={clsx("shrink-0", state === "cold" ? "text-ink-3" : state === "hot" ? "text-accent" : "text-ink", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.2 1.8c.4 3.9 3.1 5.4 4.9 8.1 1.6 2.4 1.9 5.5.2 8-1.3 1.9-3.2 3.1-5.3 3.1-3.9 0-7-2.9-7-6.7 0-2.8 1.5-4.6 3.3-6.1 0 1.9.8 3.1 2 3.9-.4-3.9.4-7.2 1.9-10.3Z"
        fill="currentColor"
      />
      <path
        d="M12.1 12.3c1 1.8 2.5 2.7 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.2.6-2 1.4-2.6.1.8.5 1.3 1 1.6-.3-1.3-.1-2.4.1-3.6Z"
        fill={state === "cold" ? "var(--paper-2)" : "var(--paper)"}
      />
    </svg>
  );
}
