import type { NextConfig } from "next";

// Public (client-safe) config. Firebase web keys are public by design; the
// user's .env uses un-prefixed names, so we map them to NEXT_PUBLIC_* here.
const pick = (...names: string[]) =>
  names.map((n) => process.env[n]).find((v) => v && v.length > 0) ?? "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: pick("NEXT_PUBLIC_FIREBASE_API_KEY", "FIREBASE_API_KEY"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: pick("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: pick("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: pick("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: pick("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_MESSAGING_SENDER_ID"),
    NEXT_PUBLIC_FIREBASE_APP_ID: pick("NEXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_APP_ID"),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: pick("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"),
  },
  experimental: {
    // Keep server bundles lean; these are only used in route handlers.
  },
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
