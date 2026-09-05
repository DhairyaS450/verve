import "server-only";

export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length ? v : undefined;
}

export function appUrl(req: Request): string {
  const configured = optionalEnv("NEXT_PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function googleClientId(): string {
  return env("GOOGLE_CLIENT_ID", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export function firebaseProjectId(): string {
  return env("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.FIREBASE_PROJECT_ID);
}
