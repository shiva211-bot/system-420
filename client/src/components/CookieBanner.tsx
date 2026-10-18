"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "gaiya_cookie_consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(!window.localStorage.getItem(KEY));
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function accept() {
    try {
      window.localStorage.setItem(KEY, "necessary");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-cyan/40 bg-black/90 p-4 text-sm text-white shadow-neon"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>
          Gaiya System uses a strictly necessary HttpOnly session cookie to keep you signed in. No advertising or analytics
          cookies are set, and no optional scripts wait on this notice. Details:{" "}
          <Link href="/cookies" className="text-cyan underline">
            cookie policy
          </Link>
          . California:{" "}
          <Link href="/do-not-sell" className="text-cyan underline">
            Do Not Sell or Share My Personal Information
          </Link>
          .
        </p>
        <button type="button" onClick={accept} className="hud-btn hud-btn-fill min-h-[44px] shrink-0 rounded-sm px-4 py-2 text-xs">
          Acknowledge necessary cookie
        </button>
      </div>
    </div>
  );
}
