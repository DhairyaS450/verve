# Verve — Design System (Master)

Modern Swiss. Paper, ink, one signal red. Type does the work.
Authored from the ui-ux-pro-max priority table and the product brief; the skill's search database was not installed in this environment, so no palette/style rows were matched.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #f3f1ec | #0f0f0e | page ground |
| `--paper-2` | #e9e6df | #191917 | hover, quiet surfaces |
| `--paper-3` | #dcd8cf | #262622 | tracks, empty bars |
| `--ink` | #131312 | #f3f1ec | text, primary buttons, bars |
| `--ink-2` | #55544f | #b5b2aa | secondary text |
| `--ink-3` | #8c8a83 | #7d7b74 | muted labels |
| `--line` | #cfcbc1 | #2f2f2b | hairlines |
| `--accent` | #e8402f | #ff5744 | record, START, "fix", regressions |
| `--good` | #1f7a4b | #4fc487 | wins, improvements |
| `--warn` | #b86e00 | #e9a23b | caution |

No gradients. No shadows. No glass. Radius 0 everywhere except the record dot.

## Typography

- Display: **Space Grotesk** 400–700 (`--font-display`). Headlines, metrics, prompts. Tracking −0.02 to −0.04em, line-height 0.96–1.02.
- Body: **DM Sans** 400–700 (`--font-body`). 16px / 1.5.
- Labels: 11px, 600, uppercase, tracking 0.1em (`.label`).
- Metrics: `.metric` — display, tabular numerals, tracking −0.04em, line-height 0.9. Sizes 40 / 56–72 / 72–112.
- Headline scale: mobile 36–44px, desktop 56–80px. One headline per screen.

## Layout

- Mobile first. 20px side padding; bottom nav 60px + safe area. Desktop: 220px left rail + content max 1080px, 48px padding.
- Each screen has one focal point (a headline, a number, or the camera). Secondary content sits in an asymmetric side column on desktop and below on mobile.
- Lists are hairline-separated rows with `01 02 03` numerals, never cards.
- Progress is horizontal: 2px tracks, ink fill, accent for live recording.

## Components

- Buttons: `.btn` (ink), `.btn-accent` (red, one per screen), `.btn-ghost` (outline). 52px min height, uppercase 14px, tracking 0.06em. Full width on mobile.
- Timer: tabular clock + 2px track.
- Waveform: 64 ink bars, live from the AnalyserNode; static envelope on review.
- Camera stage: 3:4 on mobile, 16:9 on desktop, mirrored, lens target dot, red blinking dot, countdown numeral 140px.
- Topic wheel: decelerating type ticker, no wheel graphic.
- Framework strip: numbered steps on hairlines, compact variant during recording.
- Skill tree: branches as sections, nodes as 34px squares (dashed = locked, outline = available, filled = strong, red = elite).
- Vero: geometric raven mark, single line of type. Never a chat bubble.

## Motion

- 140ms button state, 320ms `rise` entrance with 60ms stagger, 200ms linear timer track. Reduced-motion respected globally.

## Copy rules

- ≤ 14 words per Vero line. ≤ 10 words per drill step. One fix, one win.
- Numbers are the headline whenever a number exists.

## Anti-patterns

Purple/AI gradients, glassmorphism, card grids, emoji, illustration mascots, paragraphs, more than one accent button per screen, Inter/Roboto/Arial.
