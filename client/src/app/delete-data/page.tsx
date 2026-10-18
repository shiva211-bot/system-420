"use client";

import { FormEvent, useState } from "react";
import { LegalShell } from "@/components/LegalShell";
import { api } from "@/lib/api";

export default function DeleteDataPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const data = await api.requestDeletion({ email, reason });
      setMsg(data.message);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LegalShell title="Data deletion request">
      <p>
        Signed-in players can also permanently delete their account from the player console. This form logs a request if you
        cannot sign in. We reply only if the email is on file. A nominated adult (DPDP) may use this form with the account
        email and a note that they are the nominee; we will ask for proof of authority before acting.
      </p>
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
        <label className="block">
          <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">REASON (OPTIONAL)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="hud-input min-h-[96px] rounded-sm px-3 py-2.5 text-base"
          />
        </label>
        <button disabled={busy} className="hud-btn hud-btn-fill min-h-[44px] rounded-sm px-4 py-2 text-xs">
          {busy ? "SENDING..." : "SUBMIT REQUEST"}
        </button>
      </form>
      {msg && <p className="text-gold">{msg}</p>}
    </LegalShell>
  );
}
