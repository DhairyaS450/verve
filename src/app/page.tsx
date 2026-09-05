"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { VeroMark } from "@/components/VeroMark";

export default function Root() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/welcome");
    else if (profile && !profile.onboarded) router.replace("/onboarding");
    else router.replace("/today");
  }, [loading, user, profile, router]);
  return (
    <div className="min-h-dvh flex items-center justify-center text-ink-3">
      <VeroMark size={24} className="blink" />
    </div>
  );
}
