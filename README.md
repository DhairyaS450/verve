# Verve

Daily communication training. Fifteen minutes. One fix at a time.

Verve is a Duolingo-style trainer for speaking: warm the voice, spin a random topic, talk on camera, and let **Vero** (the raven coach, powered by Gemini) watch the tape and tell you the single biggest thing to fix. Tomorrow's session is built around that fix. Progressive overload for your mouth.

## How it works

1. **Today** — one focus skill, one warmup, one drill, one START button. Under ten seconds to begin.
2. **Warmup** (2–3 min) — pen-in-mouth reads, sirens, volume dials, word association, yes-and…
3. **Drill** (1–10 min) — topic wheel, PREP / 3-2-1 / What-So-What-Now-What, story formula, tough questions, toasts, keynotes. Recorded on camera with a live waveform.
4. **Review** — the recording uploads straight to a `Verve` folder in **your Google Drive** (nothing is stored on Verve's servers). While it uploads you jot a one-line reflection.
5. **Vero's verdict** — verbatim transcript, fillers per minute, pace, vocal variety, six scores, one fix, one win, timestamped moments, the next focus.
6. **Progress** — trend lines against target bands, per-branch skill levels, full history with playback from Drive.

Deterministic voice metrics (pauses, pitch spread in semitones, volume range, variety score) are computed in the browser during recording and handed to Vero alongside the video.

## The skill tree

Nine branches, 78 skills, five levels each, from `breath` to `signature-talk`: Voice · Clarity · Structure · On the spot · Story · Presence · Engagement · Conversation · Stage. 26 warmups and 51 recorded drills. See [`docs/RESEARCH.md`](docs/RESEARCH.md) for where each drill comes from (Vinh Giang, Matt Abrahams, Yasir Khan, Jun Yuh, Simon Sinek, Nancy Duarte, improv and actor training).

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript
- Firebase Auth (Google) + Firestore (owner-only rules in `firestore.rules`)
- Google Drive API (`drive.file` scope, resumable uploads from the browser)
- Gemini (`gemini-3.8-flash`, Files API for video) via `@google/genai`
- Vercel

## Setup

See [`SETUP.md`](SETUP.md) for the one-time Google Cloud / Firebase configuration. Then:

```bash
cp .env.example .env
npm install
npm run dev
```

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `node scripts/gen-icons.mjs`.

## Structure

```
src/content     skills, drills, frameworks, topics, passages, Vero copy
src/lib         firebase, db, drive, audio analyzer, recorder, planner, xp
src/lib/server  crypto, google oauth, gemini, token verification
src/app/api     auth (google, callback, handoff), drive/token, analyze
src/app/(app)   today, practice, progress, skills, session/[id], settings
src/components  camera stage, waveform, timer, topic wheel, skill tree, feedback
design-system   MASTER.md — tokens, type, layout, anti-patterns
```

## Privacy

Recordings never touch Verve's servers except transiently during analysis (fetched from your Drive, sent to Gemini, discarded). Drive refresh tokens are AES-256-GCM encrypted before they are stored in Firestore.
