import clsx from "clsx";

/**
 * Vero, the raven. Same geometric head as the mark, plus a body.
 * Four poses, used sparingly: perched (empty states, done for today),
 * welcome (sign-in, onboarding), cheer (after a good session), notes (reviewing the tape).
 * Single ink colour; details are cut in paper. `cut` flips for dark surfaces.
 */
export type VeroPose = "perched" | "welcome" | "cheer" | "notes";

const HEAD = "M5.5 15C5.5 6.5 11 3.5 15.5 3.5C18.5 3.5 20.5 5 22 6.5L31 11.5L21.5 13.2C21.6 19.5 19 24 14.5 26L13.8 29.5H11.6L11.4 26.6C7.5 25 5.5 21 5.5 15Z";
const BODY = "M46 128C46 96 74 84 104 86C138 88 160 108 160 134C160 162 132 180 102 180C68 180 46 160 46 128Z";
const TAIL = "M50 120L8 106L26 126L6 146L44 148Z";

function Head({ transform, cut }: { transform: string; cut: string }) {
  return (
    <g transform={transform}>
      <path d={HEAD} fill="currentColor" />
      <circle cx="13.2" cy="10.6" r="1.9" fill={cut} />
    </g>
  );
}

function Legs() {
  return <path d="M92 178V196M84 196H100M116 177V196M108 196H124" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

function FoldedWing({ cut }: { cut: string }) {
  return <path d="M146 114C122 103 86 108 58 131C86 141 120 143 150 132Z" stroke={cut} strokeWidth="3.5" strokeLinejoin="round" fill="none" />;
}

/** Head anchored so the neck sinks into the body. Rotation is about the head's own centre. */
const HEAD_AT = "translate(94 28) scale(2.5)";

export function Vero({ pose = "perched", size = 160, className, cut = "var(--paper)" }: { pose?: VeroPose; size?: number; className?: string; cut?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" className={clsx("shrink-0 text-ink", className)} xmlns="http://www.w3.org/2000/svg">
      {pose === "perched" && (
        <g>
          <path d={TAIL} fill="currentColor" />
          <path d={BODY} fill="currentColor" />
          <FoldedWing cut={cut} />
          <Head transform={HEAD_AT} cut={cut} />
          <Legs />
          <path d="M0 197H200" stroke="currentColor" strokeWidth="2" />
        </g>
      )}

      {pose === "welcome" && (
        <g>
          {/* raised far wing, behind the body */}
          <path d="M100 102C88 88 74 66 70 44L62 28L74 46L74 28L81 48L90 34L85 54C89 70 95 86 104 100Z" fill="currentColor" />
          <path d={TAIL} fill="currentColor" />
          <path d={BODY} fill="currentColor" />
          <FoldedWing cut={cut} />
          <Head transform={`${HEAD_AT} rotate(-6 15 14)`} cut={cut} />
          <Legs />
        </g>
      )}

      {pose === "cheer" && (
        <g>
          <rect x="28" y="36" width="9" height="9" transform="rotate(20 32 40)" fill="var(--accent)" />
          <rect x="52" y="14" width="7" height="7" transform="rotate(-15 55 17)" fill="var(--good)" />
          <rect x="176" y="24" width="8" height="8" transform="rotate(30 180 28)" fill="currentColor" />
          <rect x="16" y="72" width="6" height="6" fill="var(--good)" />
          <rect x="190" y="96" width="6" height="6" transform="rotate(12 193 99)" fill="var(--accent)" />
          <g transform="rotate(-6 100 140)">
            <path d={TAIL} fill="currentColor" />
            <path d={BODY} fill="currentColor" />
            <FoldedWing cut={cut} />
            <Head transform={`${HEAD_AT} rotate(-10 15 14)`} cut={cut} />
            <Legs />
            {/* near wing raised forward, rounded tip */}
            <path d="M128 136C136 120 150 106 166 94C169 91 174 91 177 94C180 97 180 102 177 105C162 116 152 128 146 142Z" fill="currentColor" />
            <circle cx="175" cy="93" r="8.5" fill="currentColor" />
            <path d="M186 82L192 74M190 98L198 96M180 72L182 63" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      )}

      {pose === "notes" && (
        <g>
          <path d={TAIL} fill="currentColor" />
          <path d={BODY} fill="currentColor" />
          <FoldedWing cut={cut} />
          <Head transform={`${HEAD_AT} rotate(14 15 14)`} cut={cut} />
          <Legs />
          <g transform="rotate(-8 146 150)">
            <rect x="124" y="118" width="46" height="62" fill={cut} stroke="currentColor" strokeWidth="3" />
            <rect x="139" y="112" width="16" height="10" fill="currentColor" />
            <path d="M133 136H160M133 148H154M133 160H158" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </g>
          <path d="M112 128C120 120 130 120 136 126L130 142C122 138 116 138 110 142Z" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
