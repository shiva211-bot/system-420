"use client";

import Link from "next/link";
import { HudFX } from "@/components/HudFX";
import { SiteFooter } from "@/components/SiteFooter";

export function StatusPage({
  code,
  title,
  message,
  actionHref = "/",
  actionLabel = "RETURN TO GRID",
  onAction,
}: {
  code: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="relative min-h-screen">
      <HudFX />
      <main id="main" className="relative z-10 mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xs tracking-[0.4em] text-cyan">SECTOR {code}</p>
        <h1 className="mt-4 font-display text-5xl text-white">{title}</h1>
        <p className="mt-4 max-w-xl text-white/70">{message}</p>
        {onAction ? (
          <button type="button" onClick={onAction} className="hud-btn hud-btn-fill mt-8 inline-flex min-h-[44px] items-center rounded-sm px-6 text-xs">
            {actionLabel}
          </button>
        ) : (
          <Link href={actionHref} className="hud-btn hud-btn-fill mt-8 inline-flex min-h-[44px] items-center rounded-sm px-6 text-xs">
            {actionLabel}
          </Link>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
