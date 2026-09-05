"use client";

import { firebaseAuth } from "./firebase";
import { commitSessionResults, patchSession } from "./db";
import { ensureFolder, getAccessToken, uploadResumable } from "./drive";
import { fileExtension } from "./recorder";
import type { AudioMetrics, SessionDoc, SkillState, UserProfile, VeroAnalysis } from "./types";
import { isNewDrill } from "./planner";
import { firstName } from "./format";

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
}): Promise<{ analysis: VeroAnalysis; xp: number; profile: UserProfile }> {
  const { profile, session, skills, sessions, audio } = opts;
  if (!session.recording) throw new Error("no recording");
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("not signed in");
  const previous = sessions.find((s) => s.id !== session.id && s.status === "analyzed" && s.ai);
  await patchSession(profile.uid, session.id, { status: "analyzing" });
  const token = await getAccessToken(profile.uid);
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({
      accessToken: token,
      fileId: session.recording.driveFileId,
      mimeType: session.recording.mimeType,
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
      if (j?.message) msg = j.message;
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
    isNewDrill: isNewDrill(session.drillId, sessions.filter((s) => s.id !== session.id)),
  });
  return { analysis, xp: committed.xp, profile: committed.profile };
}
