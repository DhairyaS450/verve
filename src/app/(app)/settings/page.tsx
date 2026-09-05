"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { deleteAllUserData, updateProfile } from "@/lib/db";
import type { Goal } from "@/lib/types";
import { userLevel } from "@/lib/xp";
import { getGeminiKeyStatus, removeOwnGeminiKey, saveOwnGeminiKey, type GeminiKeyStatus } from "@/lib/keys";
import { useInstallPrompt } from "@/components/PwaRegister";
import { VeroLine } from "@/components/VeroMark";

const GOALS: { id: Goal; label: string }[] = [
  { id: "spot", label: "Think on the spot" },
  { id: "story", label: "Tell better stories" },
  { id: "stage", label: "Speak on stage" },
  { id: "confidence", label: "Sound confident" },
];

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const install = useInstallPrompt();

  const [keyStatus, setKeyStatus] = useState<GeminiKeyStatus | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    getGeminiKeyStatus(profile.uid).then((s) => alive && setKeyStatus(s));
    return () => {
      alive = false;
    };
  }, [profile?.uid, profile?.geminiKeyLast4]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;
  const lvl = userLevel(profile.xp ?? 0);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      const { last4 } = await saveOwnGeminiKey(profile.uid, keyInput.trim());
      setKeyInput("");
      setKeyMsg({ kind: "ok", text: `Saved. Vero now runs on your key ····${last4}.` });
      setKeyStatus((s) => ({ hasOwnKey: true, last4, sharedAllowed: s?.sharedAllowed ?? false }));
    } catch (e) {
      setKeyMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setKeyBusy(false);
    }
  };

  const removeKey = async () => {
    setKeyBusy(true);
    try {
      await removeOwnGeminiKey(profile.uid);
      setKeyStatus((s) => ({ hasOwnKey: false, sharedAllowed: s?.sharedAllowed ?? false }));
      setKeyMsg({ kind: "ok", text: "Key removed." });
    } finally {
      setKeyBusy(false);
    }
  };

  const wipe = async () => {
    setDeleting(true);
    try {
      await deleteAllUserData(profile.uid);
      await signOut();
      router.replace("/welcome");
    } finally {
      setDeleting(false);
    }
  };

  const brain = !keyStatus ? "Checking…" : keyStatus.hasOwnKey ? `Your key ····${keyStatus.last4}` : keyStatus.sharedAllowed ? "Verve's shared key" : "No key yet";

  return (
    <div className="max-w-[640px] pb-16">
      {/* Account */}
      <section className="flex items-center gap-5">
        {profile.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoURL} alt="" width={64} height={64} className="w-[64px] h-[64px] object-cover bg-paper-2" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-[64px] h-[64px] bg-ink text-paper font-display text-[26px] flex items-center justify-center">{profile.displayName?.[0] ?? "V"}</div>
        )}
        <div className="min-w-0">
          <h2 className="font-display font-medium text-[28px] md:text-[36px] leading-[1] tracking-[-0.03em] truncate">{profile.displayName}</h2>
          <p className="mt-1 text-[13px] text-ink-2 truncate">{profile.email}</p>
          <p className="mt-1 label">
            Level {lvl.level} {lvl.name} · <span className="num">{profile.xp}</span> xp · <span className="num">{profile.totalSessions}</span> sessions
          </p>
        </div>
      </section>

      {/* Practice */}
      <section className="mt-12 hairline-strong pt-5">
        <h3 className="font-display text-[20px] font-medium">Practice</h3>
        <p className="label mt-5">Daily session</p>
        <div className="mt-3 grid grid-cols-3 border border-ink">
          {([5, 10, 15] as const).map((m) => (
            <button key={m} type="button" onClick={() => updateProfile(profile.uid, { sessionMinutes: m })} aria-pressed={profile.sessionMinutes === m} className={clsx("min-h-[52px] font-display text-[18px] num border-r border-ink last:border-r-0", profile.sessionMinutes === m ? "bg-ink text-paper" : "")}>
              {m} min
            </button>
          ))}
        </div>
        <p className="label mt-8">Goal</p>
        <ol className="mt-2 border-t border-line">
          {GOALS.map((g) => (
            <li key={g.id} className="border-b border-line">
              <button type="button" onClick={() => updateProfile(profile.uid, { goal: g.id })} aria-pressed={profile.goal === g.id} className="w-full flex items-center justify-between py-3.5 min-h-[52px] text-left">
                <span className="font-display text-[17px]">{g.label}</span>
                <span className={clsx("w-[16px] h-[16px] border border-ink", profile.goal === g.id && "bg-ink")} />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* Gemini key */}
      <section id="gemini" className="mt-12 hairline-strong pt-5 scroll-mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-[20px] font-medium">Vero&apos;s brain</h3>
          <span className="label">{brain}</span>
        </div>
        <VeroLine muted className="mt-4">
          {keyStatus?.hasOwnKey || keyStatus?.sharedAllowed ? "Every tape you record is reviewed with this key." : "I can't review tapes without a Gemini key."}
        </VeroLine>
        <div className="mt-5">
          <label className="label-ink block" htmlFor="gemini-key">
            Your Gemini API key
          </label>
          <div className="flex gap-3 items-end">
            <input
              id="gemini-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="field mt-1"
              placeholder="AIza…"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveKey()}
            />
            <button type="button" className="btn btn-sm shrink-0" onClick={saveKey} disabled={keyBusy || keyInput.trim().length < 20}>
              {keyBusy ? "Checking" : "Save"}
            </button>
          </div>
          {keyMsg && <p className={clsx("mt-2 text-[13px]", keyMsg.kind === "ok" ? "text-good" : "text-accent")}>{keyMsg.text}</p>}
          <p className="mt-3 text-[12px] text-ink-3">
            Get one at aistudio.google.com. A paid-tier key avoids free-tier limits on video. It is validated once, encrypted with AES-256-GCM, and stored only in your own Verve account. Video analysis costs roughly a cent per session.
          </p>
          {keyStatus?.hasOwnKey && (
            <button type="button" className="btn-ghost btn-sm mt-4" onClick={removeKey} disabled={keyBusy}>
              Remove my key
            </button>
          )}
        </div>
      </section>

      {/* Drive */}
      <section className="mt-12 hairline-strong pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-[20px] font-medium">Google Drive</h3>
          <span className="label">{profile.driveConnected ? "Connected" : "Not connected"}</span>
        </div>
        <p className="mt-3 text-[14px] text-ink-2">{profile.driveConnected ? profile.driveEmail || profile.email : "Recordings need a Drive connection."}</p>
        <p className="text-[12px] text-ink-3 mt-1">Recordings live in a folder called Verve. Verve can only see files it created. If uploads start failing, reconnect here.</p>
        <a href="/api/auth/google?next=/settings" className="btn-ghost btn-sm mt-4">
          {profile.driveConnected ? "Reconnect Drive" : "Connect Drive"}
        </a>
      </section>

      {/* Install */}
      <section className="mt-12 hairline-strong pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-[20px] font-medium">Install Verve</h3>
          <span className="label">{install.installed ? "Installed" : "Web app"}</span>
        </div>
        {install.installed ? (
          <p className="mt-3 text-[14px] text-ink-2">You&apos;re running the installed app.</p>
        ) : install.available ? (
          <>
            <p className="mt-3 text-[14px] text-ink-2">Full screen, on your home screen, one tap to practice.</p>
            <button type="button" className="btn btn-sm mt-4" onClick={install.prompt}>
              Install app
            </button>
          </>
        ) : install.isIOS ? (
          <ol className="mt-3 text-[14px] text-ink-2 space-y-1">
            <li>1. Tap Share in Safari.</li>
            <li>2. Tap &quot;Add to Home Screen&quot;.</li>
          </ol>
        ) : (
          <p className="mt-3 text-[14px] text-ink-2">In Chrome or Edge, use the install icon in the address bar, or the browser menu → Install Verve.</p>
        )}
      </section>

      {/* Account actions */}
      <section className="mt-12 hairline-strong pt-5">
        <h3 className="font-display text-[20px] font-medium">Account</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={async () => {
              await signOut();
              router.replace("/welcome");
            }}
          >
            Sign out
          </button>
          {!confirmDelete ? (
            <button type="button" className="btn-ghost btn-sm text-accent border-accent" onClick={() => setConfirmDelete(true)}>
              Delete my data
            </button>
          ) : (
            <div className="w-full mt-2 border border-accent p-4">
              <p className="text-[14px]">Deletes every session, score and plan in Verve and signs you out. Recordings in your Drive are not touched.</p>
              <div className="mt-3 flex gap-3">
                <button type="button" className="btn-accent btn-sm" onClick={wipe} disabled={deleting}>
                  {deleting ? "Deleting" : "Yes, delete everything"}
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-8 text-[11px] text-ink-3">Verve · Vero is a raven.</p>
      </section>
    </div>
  );
}
