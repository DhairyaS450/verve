"use client";

import { useEffect, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __verveInstallEvent?: BeforeInstallPromptEvent;
  }
}

/** Registers the service worker and captures the install prompt. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__verveInstallEvent = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("verve:installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

const noop = () => () => {};
const subInstallable = (cb: () => void) => {
  window.addEventListener("verve:installable", cb);
  window.addEventListener("appinstalled", cb);
  return () => {
    window.removeEventListener("verve:installable", cb);
    window.removeEventListener("appinstalled", cb);
  };
};

export function useInstallPrompt() {
  const available = useSyncExternalStore(subInstallable, () => Boolean(window.__verveInstallEvent), () => false);
  const installed = useSyncExternalStore(
    subInstallable,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  const isIOS = useSyncExternalStore(noop, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);
  const prompt = async () => {
    const e = window.__verveInstallEvent;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => ({ outcome: "dismissed" }));
    window.__verveInstallEvent = undefined;
    window.dispatchEvent(new Event("verve:installable"));
  };
  return { available, installed, isIOS, prompt };
}
