import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { firebaseProjectId } from "./env";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/** Verifies a Firebase ID token without the Admin SDK. */
export async function verifyFirebaseIdToken(req: Request): Promise<VerifiedUser> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("unauthorized");
  const projectId = firebaseProjectId();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = (payload.sub as string) ?? (payload.user_id as string);
  if (!uid) throw new Error("unauthorized");
  return { uid, email: typeof payload.email === "string" ? payload.email : undefined };
}
