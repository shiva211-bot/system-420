"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AdminPanel } from "@/components/AdminPanel";
import { BootScreen, INTRO_STORAGE_KEY } from "@/components/BootScreen";
import { ChatRoom } from "@/components/ChatRoom";
import { HudFX } from "@/components/HudFX";
import { api } from "@/lib/api";
import { useNexus } from "@/lib/store";

function guestIntroSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function HomePage() {
  const me = useNexus((s) => s.me);
  const setAuth = useNexus((s) => s.setAuth);
  const setOwned = useNexus((s) => s.setOwned);
  const patchMe = useNexus((s) => s.patchMe);
  const [sessionReady, setSessionReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (cancelled) return;
        setAuth(null, data.user);
        setOwned(data.titles);
      })
      .catch(() => {
        if (!cancelled) setAuth(null, null);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setAuth, setOwned]);

  useEffect(() => {
    if (!sessionReady) return;
    const identity = me?.id ?? "guest";
    if (handledRef.current === identity) return;
    handledRef.current = identity;
    setIntroDone(me ? me.introSeen === true : guestIntroSeen());
  }, [sessionReady, me]);

  const handleIntroDone = useCallback(() => {
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
    } catch {
      /* storage unavailable */
    }
    const current = useNexus.getState().me;
    if (current) {
      patchMe({ ...current, introSeen: true });
      void api.markIntroSeen().catch(() => undefined);
    }
    setIntroDone(true);
  }, [patchMe]);

  const ready = sessionReady && introDone;

  return (
    <>
      {!sessionReady ? (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
          <HudFX />
          <div className="relative z-10 flex flex-col items-center gap-4" role="status" aria-live="polite" aria-label="Loading">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan/25 border-t-cyan shadow-neon" />
            <p className="font-mono text-[11px] tracking-[0.4em] text-cyan/80">BOOTING GAIYA SYSTEM</p>
          </div>
        </div>
      ) : null}
      {sessionReady && !introDone ? <BootScreen onDone={handleIntroDone} /> : null}
      {ready ? (
        <main id="main">
          <h1 className="sr-only">GAIYA SYSTEM</h1>
          {me ? me.role === "ADMIN" ? <AdminPanel /> : <ChatRoom /> : <AuthGate />}
        </main>
      ) : null}
    </>
  );
}
