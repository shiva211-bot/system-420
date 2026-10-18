"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

export const INTRO_STORAGE_KEY = "lockIntroCompleted";

const LockIntroScene = dynamic(
  () => import("@/components/lock-intro/LockIntroScene").then((m) => m.LockIntroScene),
  { ssr: false },
);

export function BootScreen({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [leaving, setLeaving] = useState(false);
  const [webgl, setWebgl] = useState(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(() => onDoneRef.current(), 420);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finish();
      return;
    }
    setWebgl(true);
    const failSafe = window.setTimeout(finish, 28000);
    return () => window.clearTimeout(failSafe);
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[200] bg-black transition-opacity duration-500 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-label="Gaiya System loading"
    >
      {webgl ? <LockIntroScene onComplete={finish} /> : null}
    </div>
  );
}
