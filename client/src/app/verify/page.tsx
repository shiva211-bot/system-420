"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LegalShell } from "@/components/LegalShell";

export default function VerifyPage() {
  const [msg] = useState("Operator activation uses the date OTP on the create-operator gate. Email links are no longer used.");
  function goHome(e: FormEvent) {
    e.preventDefault();
  }
  return (
    <LegalShell title="Operator OTP">
      <p>{msg}</p>
      <form onSubmit={goHome}>
        <Link href="/" className="hud-btn hud-btn-fill mt-4 inline-flex min-h-[44px] items-center rounded-sm px-4 py-2 text-xs">
          RETURN TO AUTH GATE
        </Link>
      </form>
    </LegalShell>
  );
}
