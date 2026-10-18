"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HudFX } from "@/components/HudFX";
import { SiteFooter } from "@/components/SiteFooter";

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <HudFX />
      <main id="main" className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <p className="font-display text-xs tracking-[0.4em] text-cyan">
          <Link href="/" className="min-h-[44px] inline-flex items-center hover:underline">
            GAIYA SYSTEM
          </Link>
        </p>
        <h1 className="mt-4 font-display text-4xl text-white">{title}</h1>
        <div className="hud-panel mt-8 space-y-4 p-8 text-base leading-relaxed text-white/80">{children}</div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="hud-btn hud-btn-fill inline-flex min-h-[44px] items-center rounded-sm px-6 py-2 text-xs"
          >
            RETURN TO HOMEPAGE
          </Link>
          <a
            href="#main"
            className="hud-btn inline-flex min-h-[44px] items-center rounded-sm px-6 py-2 text-xs"
          >
            BACK TO TOP
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
