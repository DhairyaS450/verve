"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseAuth, firestore } from "./firebase";
import { ensureProfile, userDocPath } from "./db";
import type { UserProfile } from "./types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ user: null, profile: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth(), async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubDoc: (() => void) | undefined;
    (async () => {
      try {
        await ensureProfile(user);
      } catch (e) {
        console.error("ensureProfile failed", e);
      }
      if (cancelled) return;
      unsubDoc = onSnapshot(
        doc(firestore(), userDocPath(user.uid)),
        (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
          setLoading(false);
        },
        (err) => {
          console.error("profile snapshot", err);
          setLoading(false);
        },
      );
    })();
    return () => {
      cancelled = true;
      unsubDoc?.();
    };
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      signOut: async () => {
        try {
          sessionStorage.removeItem("verve.drive.token");
        } catch {}
        await fbSignOut(firebaseAuth());
      },
    }),
    [user, profile, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
