"use client";

import Link from "next/link";
import { LEGAL_NAV, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-cyan/20 bg-black/40 px-6 py-6 text-sm text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <p>
          {SITE.legalName} · Headquarters: {SITE.headquarters} · Customer care:{" "}
          <a className="text-cyan underline" href={`mailto:${SITE.customerCare}`}>
            {SITE.customerCare}
          </a>
          {" · "}
          Grievance officer: {SITE.grievanceOfficer}{" "}
          <a className="text-cyan underline" href={`mailto:${SITE.grievanceEmail}`}>
            {SITE.grievanceEmail}
          </a>
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="min-h-[44px] inline-flex items-center text-cyan hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
