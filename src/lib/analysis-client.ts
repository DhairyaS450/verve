"use client";

import { firebaseAuth } from "./firebase";
import { commitSessionResults, getGeminiKey, patchSession } from "./db";
import { ensureFolder, getAccessToken, uploadResumable } from "./drive";
import { fileExtension } from "./recorder";
import type { AudioMetrics, SessionDoc, SkillState, UserProfile, VeroAnalysis } from "./types";
import { isNewDrill } from "./planner";
import { firstName } from "./format";
import { historyForPrompt } from "./coach";
import { FORMATS, bandNamesFor, rubricFor } from "@/content/roleplay";

export async function uploadRecording(opts: {
  profile: UserProfile;
  session: SessionDoc;
  blob: Blob;
  mimeType: string;
  durationSec: number;
  onProgress?: (f: number) => void;
}): Promise<NonNullable<SessionDoc["recording"]>> {
  const { profile, session, blob, mimeType, durationSec, onProgress } = opts;
  const token = await getAccessToken(profile.uid);
  const folderId = await ensureFolder(profile.uid, token, profile.driveFolderId);
  const name = `Verve ${session.date} ${session.drillName}.${fileExtension(mimeType)}`;
  const file = await uploadResumable(token, blob, { name, mimeType, folderId, appProperties: { verveSessionId: session.id } }, onProgress);
  const recording = { driveFileId: file.id, mimeType, bytes: blob.size, durationSec: Math.round(durationSec * 10) / 10, webViewLink: file.webViewLink };
  await patchSession(profile.uid, session.id, { recording, status: "uploaded" });
  return recording;
}

export async function analyzeSession(opts: {
  profile: UserProfile;
  session: SessionDoc;
  skills: Record<string, SkillState>;
  sessions: SessionDoc[];
  audio?: AudioMetrics;
}): Promise<{ analysis: VeroAnalysis; xp: number; profile: UserProfile; coach: SessionDoc["coach"]; skillUpdates: Record<string, SkillState> }> {
  const { profile, session, skills, sessions, audio } = opts;
  if (!session.recording) throw new Error("no recording");
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("not signed in");
  const others = sessions.filter((s) => s.id !== session.id);
  const previous = others.find((s) => s.status === "analyzed" && s.ai);
  const history = historyForPrompt(others, profile.focus);
  await patchSession(profile.uid, session.id, { status: "analyzing" });
  const [token, ownKey] = await Promise.all([getAccessToken(profile.uid), getGeminiKey(profile.uid).catch(() => null)]);
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({
      accessToken: token,
      fileId: session.recording.driveFileId,
      mimeType: session.recording.mimeType,
      encGeminiKey: ownKey?.encKey,
      context: {
        drillId: session.drillId,
        kind: session.kind,
        prompt: session.prompt,
        promptExtra: session.promptExtra,
        focusSkillId: session.focusSkillId,
        frameworkId: session.frameworkId,
        durationSec: session.recording.durationSec,
        displayName: firstName(profile.displayName),
        audio: audio ?? session.audio,
        endedBy: session.endedBy,
        history,
        roleplay: session.roleplay
          ? {
              org: session.roleplay.org,
              category: session.roleplay.category,
              formatName: FORMATS[session.roleplay.formatId]?.name ?? session.roleplay.formatId,
              prepMinutes: Math.round((FORMATS[session.roleplay.formatId]?.prepSeconds ?? 600) / 60),
              presentMinutes: Math.round((FORMATS[session.roleplay.formatId]?.presentSeconds ?? 600) / 60),
              role: session.roleplay.role,
              judgeRole: session.roleplay.judgeRole,
              situation: session.roleplay.situation,
              ask: session.roleplay.ask,
              pis: session.roleplay.pis,
              questionsAsked: session.roleplay.questionsAsked,
              rubric: rubricFor(session.roleplay.category, session.roleplay.pis).map((r) => ({ id: r.id, label: r.label, max: r.max, bands: r.bands })),
              bandNames: [...bandNamesFor(session.roleplay.category)],
            }
          : undefined,
        previous: previous?.ai
          ? {
              topFixTitle: previous.ai.topFix.title,
              topFixSkillId: previous.ai.topFix.skillId,
              fillersPerMin: previous.ai.fillers.perMin,
              overall: previous.ai.scores.overall,
            }
          : undefined,
      },
    }),
  });
  if (!res.ok) {
    let msg = `analysis failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error === "key_required") msg = "Vero needs a Gemini API key. Add yours in Settings.";
      else if (j?.error === "key_invalid") msg = "Your Gemini API key was rejected. Update it in Settings.";
      else if (j?.message) msg = j.message;
      else if (j?.error) msg = j.error;
    } catch {}
    await patchSession(profile.uid, session.id, { status: "failed", error: msg });
    throw new Error(msg);
  }
  const { analysis } = (await res.json()) as { analysis: VeroAnalysis };
  const committed = await commitSessionResults({
    profile,
    session,
    analysis,
    skills,
    sessions: others,
    isNewDrill: isNewDrill(session.drillId, others),
  });
  return { analysis, xp: committed.xp, profile: committed.profile, coach: committed.coach, skillUpdates: committed.skillUpdates };
}
