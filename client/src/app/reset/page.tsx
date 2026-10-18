"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LegalShell } from "@/components/LegalShell";
import { api } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const initial = params?.get("token") ?? "";
  const [token, setToken] = useState(initial);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(initial);
  }, [initial]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.resetPassword(token, password);
      setMsg("Password updated. Sign in with the new password.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">TOKEN</span>
        <input value={token} onChange={(e) => setToken(e.target.value)} className="hud-input rounded-sm px-3 py-2.5 text-base" />
      </label>
      <label className="block">
        <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">NEW PASSWORD</span>
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="hud-input rounded-sm px-3 py-2.5 text-base"
        />
      </label>
      <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-4 py-2 text-xs">
        UPDATE PASSWORD
      </button>
      {msg && <p className="text-gold">{msg}</p>}
    </form>
  );
}

export default function ResetPage() {
  return (
    <LegalShell title="Reset password">
      <Suspense fallback={<p>Loading...</p>}>
        <ResetForm />
      </Suspense>
    </LegalShell>
  );
}
