"use client";

import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import type { DrivePrivate, GeminiPrivate, PlanDoc, SessionDoc, SkillState, UserProfile, VeroAnalysis } from "./types";
import { localDateStr } from "./format";
import { applySkillXP, nextStreak, sessionXP } from "./xp";
import { decideFocus, nextFocusBlock } from "./coach";

export const ROOT = "verveUsers";
export const userDocPath = (uid: string) => `${ROOT}/${uid}`;

export async function ensureProfile(user: User): Promise<UserProfile> {
  const ref = doc(firestore(), userDocPath(user.uid));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const p = snap.data() as UserProfile;
    // Keep basic identity fresh
    const patch: Partial<UserProfile> = {};
    if (user.displayName && user.displayName !== p.displayName) patch.displayName = user.displayName;
    if (user.photoURL && user.photoURL !== p.photoURL) patch.photoURL = user.photoURL;
    if (Object.keys(patch).length) await updateDoc(ref, patch);
    return { ...p, ...patch };
  }
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "You",
    email: user.email ?? "",
    photoURL: user.photoURL ?? undefined,
    onboarded: false,
    createdAt: Date.now(),
    streak: { count: 0, lastDate: null, best: 0 },
    xp: 0,
    totalSessions: 0,
    sessionMinutes: 10,
  };
  await setDoc(ref, stripUndefined(profile));
  return profile;
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>) {
  await updateDoc(doc(firestore(), userDocPath(uid)), stripUndefined(patch));
}

// ---------------- Drive private ----------------
export async function saveDriveToken(uid: string, data: DrivePrivate) {
  await setDoc(doc(firestore(), `${userDocPath(uid)}/private/drive`), stripUndefined(data));
  await updateDoc(doc(firestore(), userDocPath(uid)), { driveConnected: true, driveEmail: data.email ?? "" });
}

export async function getDriveToken(uid: string): Promise<DrivePrivate | null> {
  const snap = await getDoc(doc(firestore(), `${userDocPath(uid)}/private/drive`));
  return snap.exists() ? (snap.data() as DrivePrivate) : null;
}

// ---------------- Gemini key (bring your own) ----------------
export async function saveGeminiKey(uid: string, data: GeminiPrivate) {
  await setDoc(doc(firestore(), `${userDocPath(uid)}/private/gemini`), stripUndefined(data));
  await updateDoc(doc(firestore(), userDocPath(uid)), { geminiKeyLast4: data.last4 });
}

export async function getGeminiKey(uid: string): Promise<GeminiPrivate | null> {
  const snap = await getDoc(doc(firestore(), `${userDocPath(uid)}/private/gemini`));
  return snap.exists() ? (snap.data() as GeminiPrivate) : null;
}

export async function deleteGeminiKey(uid: string) {
  await deleteDoc(doc(firestore(), `${userDocPath(uid)}/private/gemini`));
  await updateDoc(doc(firestore(), userDocPath(uid)), { geminiKeyLast4: deleteField() });
}

/** Wipes every Verve document for this user. Drive files are left untouched. */
export async function deleteAllUserData(uid: string) {
  const db = firestore();
  for (const sub of ["sessions", "skills", "plans", "private"]) {
    const snap = await getDocs(collection(db, `${userDocPath(uid)}/${sub}`));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, userDocPath(uid)));
}

// ---------------- Sessions ----------------
export function newSessionId() {
  return doc(collection(firestore(), `${ROOT}/x/sessions`)).id;
}

export async function saveSession(uid: string, session: SessionDoc) {
  await setDoc(doc(firestore(), `${userDocPath(uid)}/sessions/${session.id}`), stripUndefined(session), { merge: true });
}

export async function patchSession(uid: string, id: string, patch: Partial<SessionDoc>) {
  await setDoc(doc(firestore(), `${userDocPath(uid)}/sessions/${id}`), stripUndefined(patch), { merge: true });
}

export async function getSession(uid: string, id: string): Promise<SessionDoc | null> {
  const snap = await getDoc(doc(firestore(), `${userDocPath(uid)}/sessions/${id}`));
  return snap.exists() ? (snap.data() as SessionDoc) : null;
}

export async function listSessions(uid: string, n = 60): Promise<SessionDoc[]> {
  const q = query(collection(firestore(), `${userDocPath(uid)}/sessions`), orderBy("createdAt", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SessionDoc);
}

export async function listAnalyzedSessions(uid: string, n = 60): Promise<SessionDoc[]> {
  const q = query(
    collection(firestore(), `${userDocPath(uid)}/sessions`),
    where("status", "==", "analyzed"),
    orderBy("createdAt", "desc"),
    limit(n),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SessionDoc);
}

// ---------------- Skills ----------------
export async function getSkillStates(uid: string): Promise<Record<string, SkillState>> {
  const snap = await getDocs(collection(firestore(), `${userDocPath(uid)}/skills`));
  const out: Record<string, SkillState> = {};
  snap.docs.forEach((d) => (out[d.id] = d.data() as SkillState));
  return out;
}

// ---------------- Plans ----------------
export async function getPlan(uid: string, date = localDateStr()): Promise<PlanDoc | null> {
  const snap = await getDoc(doc(firestore(), `${userDocPath(uid)}/plans/${date}`));
  return snap.exists() ? (snap.data() as PlanDoc) : null;
}

export async function savePlan(uid: string, plan: PlanDoc) {
  await setDoc(doc(firestore(), `${userDocPath(uid)}/plans/${plan.date}`), stripUndefined(plan), { merge: true });
}

/**
 * Called once a session is analyzed. Awards XP, levels skills, bumps streak,
 * updates focus, marks the plan complete. One atomic batch.
 */
export async function commitSessionResults(opts: {
  profile: UserProfile;
  session: SessionDoc;
  analysis: VeroAnalysis;
  skills: Record<string, SkillState>;
  sessions: SessionDoc[];
  isNewDrill: boolean;
}): Promise<{ xp: number; skillUpdates: Record<string, SkillState>; profile: UserProfile; coach: SessionDoc["coach"] }> {
  const { profile, session, analysis, skills, sessions, isNewDrill } = opts;
  const db = firestore();
  const batch = writeBatch(db);
  const xp = sessionXP(analysis, isNewDrill, Boolean(session.warmupId));
  const today = localDateStr();
  const streak = nextStreak(profile.streak, today);
  const skillUpdates = applySkillXP(skills, session.skillIds, analysis.scores.overall, Date.now());
  const mergedSkills = { ...skills, ...skillUpdates };
  for (const [id, st] of Object.entries(skillUpdates)) {
    batch.set(doc(db, `${userDocPath(profile.uid)}/skills/${id}`), st, { merge: true });
  }

  // The coach decides the next focus from history, with this session included.
  const analyzedSession: SessionDoc = { ...session, ai: analysis, status: "analyzed" };
  const history = [analyzedSession, ...sessions.filter((s) => s.id !== session.id)];
  const decision = decideFocus({ profile, sessions: history, skills: mergedSkills });
  const focus = nextFocusBlock(profile.focus, decision, history);

  const profilePatch: Partial<UserProfile> = {
    xp: (profile.xp ?? 0) + xp,
    totalSessions: (profile.totalSessions ?? 0) + 1,
    streak,
    focusSkillId: decision.skillId,
    focus,
  };
  if (session.kind === "baseline") {
    profilePatch.baselineSessionId = session.id;
    profilePatch.onboarded = true;
  }
  batch.update(doc(db, userDocPath(profile.uid)), stripUndefined(profilePatch));
  batch.set(
    doc(db, `${userDocPath(profile.uid)}/sessions/${session.id}`),
    stripUndefined({ ai: analysis, status: "analyzed", xp, isNewDrill, coach: decision }),
    { merge: true },
  );
  if (session.kind === "daily") {
    batch.set(doc(db, `${userDocPath(profile.uid)}/plans/${session.date}`), { completed: true, sessionId: session.id }, { merge: true });
  }
  // Tomorrow's plan is rebuilt from the new focus.
  await batch.commit();
  return { xp, skillUpdates, profile: { ...profile, ...profilePatch } as UserProfile, coach: decision };
}

export function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = stripUndefined(v as object);
    else out[k] = v;
  }
  return out as T;
}
