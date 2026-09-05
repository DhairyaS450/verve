"use client";

import { getDriveToken, updateProfile } from "./db";
import { firebaseAuth } from "./firebase";

const CACHE_KEY = "verve.drive.token";
const FOLDER_NAME = "Verve";
const CHUNK = 2 * 1024 * 1024; // 2 MiB — multiple of 256 KiB as Drive requires

export class DriveNotConnected extends Error {
  constructor() {
    super("Google Drive is not connected.");
    this.name = "DriveNotConnected";
  }
}

async function idToken(): Promise<string> {
  const u = firebaseAuth().currentUser;
  if (!u) throw new Error("not signed in");
  return u.getIdToken();
}

export async function getAccessToken(uid: string, force = false): Promise<string> {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as { token: string; exp: number; uid: string };
        if (c.uid === uid && c.exp - Date.now() > 60_000) return c.token;
      }
    } catch {}
  }
  const priv = await getDriveToken(uid);
  if (!priv?.encRefreshToken) throw new DriveNotConnected();
  const res = await fetch("/api/drive/token", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await idToken()}` },
    body: JSON.stringify({ encRefreshToken: priv.encRefreshToken }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new DriveNotConnected();
    throw new Error(`token refresh failed (${res.status})`);
  }
  const data = (await res.json()) as { accessToken: string; expiresAt: number };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ token: data.accessToken, exp: data.expiresAt, uid }));
  } catch {}
  return data.accessToken;
}

export function cacheAccessToken(uid: string, token: string, expiresAt: number) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ token, exp: expiresAt, uid }));
  } catch {}
}

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` } });
  return res;
}

export async function ensureFolder(uid: string, token: string, knownId?: string): Promise<string> {
  if (knownId) {
    const r = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${knownId}?fields=id,trashed`);
    if (r.ok) {
      const j = (await r.json()) as { id: string; trashed: boolean };
      if (!j.trashed) return j.id;
    }
  }
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const list = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`);
  if (list.ok) {
    const j = (await list.json()) as { files: { id: string }[] };
    if (j.files?.length) {
      await updateProfile(uid, { driveFolderId: j.files[0].id });
      return j.files[0].id;
    }
  }
  const create = await driveFetch(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!create.ok) throw new Error(`could not create Drive folder (${create.status})`);
  const j = (await create.json()) as { id: string };
  await updateProfile(uid, { driveFolderId: j.id });
  return j.id;
}

export interface UploadResult {
  id: string;
  name: string;
  size: number;
  webViewLink?: string;
}

/** Resumable upload straight from the browser to the user's Drive. */
export async function uploadResumable(
  token: string,
  blob: Blob,
  meta: { name: string; mimeType: string; folderId: string; appProperties?: Record<string, string> },
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  const init = await driveFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,webViewLink",
    {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": meta.mimeType,
        "x-upload-content-length": String(blob.size),
      },
      body: JSON.stringify({ name: meta.name, mimeType: meta.mimeType, parents: [meta.folderId], appProperties: meta.appProperties }),
      signal,
    },
  );
  if (!init.ok) throw new Error(`upload init failed (${init.status})`);
  const location = init.headers.get("location");
  if (!location) throw new Error("upload init: no session URI");

  let offset = 0;
  const total = blob.size;
  while (offset < total) {
    const end = Math.min(offset + CHUNK, total);
    const chunk = blob.slice(offset, end);
    const result = await putChunk(location, chunk, offset, end - 1, total, (loaded) => onProgress?.((offset + loaded) / total), signal);
    if (result.done) {
      onProgress?.(1);
      return result.file;
    }
    offset = result.nextOffset;
  }
  throw new Error("upload ended unexpectedly");
}

function putChunk(
  uri: string,
  chunk: Blob,
  start: number,
  end: number,
  total: number,
  onLoaded: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<{ done: true; file: UploadResult } | { done: false; nextOffset: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uri, true);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onLoaded(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          resolve({ done: true, file: JSON.parse(xhr.responseText) as UploadResult });
        } catch {
          resolve({ done: true, file: { id: "", name: "", size: total } });
        }
      } else if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range");
        const next = range ? Number(range.split("-")[1]) + 1 : end + 1;
        resolve({ done: false, nextOffset: next });
      } else {
        reject(new Error(`upload chunk failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.onabort = () => reject(new Error("upload aborted"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(chunk);
  });
}

export async function fetchFileBlob(token: string, fileId: string, onProgress?: (fraction: number) => void): Promise<Blob> {
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (!res.body || !len || !onProgress) return res.blob();
  const reader = res.body.getReader();
  const parts: BlobPart[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      parts.push(value);
      got += value.length;
      onProgress(got / len);
    }
  }
  return new Blob(parts, { type: res.headers.get("content-type") ?? "video/webm" });
}

export async function getFileMeta(token: string, fileId: string): Promise<{ id: string; name: string; size: number; webViewLink?: string; trashed: boolean } | null> {
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,webViewLink,trashed`);
  if (!res.ok) return null;
  const j = await res.json();
  return { ...j, size: Number(j.size ?? 0) };
}
