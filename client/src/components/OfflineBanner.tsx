"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="relative z-[80] border-b border-mag/40 bg-black/80 px-4 py-3 text-center text-sm text-white/80" role="status">
      No uplink. Chat and wallets need a live channel.{" "}
      <Link href="/offline" className="text-cyan underline">
        Offline status
      </Link>
    </div>
  );
}
