"use client";

import { FormEvent, useState } from "react";
import { LegalShell } from "@/components/LegalShell";
import { api } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const data = await api.forgotPassword(email);
      setMsg(data.message);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LegalShell title="Forgot password">
      <p>If an account exists for that email, we send a single-use reset link that expires in one hour.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">EMAIL</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="hud-input rounded-sm px-3 py-2.5 text-base"
          />
        </label>
        <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-4 py-2 text-xs">
          SEND RESET
        </button>
      </form>
      {msg && <p className="text-gold">{msg}</p>}
    </LegalShell>
  );
}
