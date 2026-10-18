"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useNexus } from "@/lib/store";
import type { AuthOptions } from "@/lib/types";
import { HudFX } from "@/components/HudFX";
import { SiteFooter } from "@/components/SiteFooter";

export function AuthGate() {
  const setAuth = useNexus((s) => s.setAuth);
  const setOwned = useNexus((s) => s.setOwned);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [realName, setRealName] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [age, setAge] = useState("18");
  const [bloodType, setBloodType] = useState("");
  const [country, setCountry] = useState("INDIA");
  const [state, setState] = useState("MAHARASHTRA");
  const [region, setRegion] = useState("TRISHUL");
  const [area, setArea] = useState("OUTER");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [opts, setOpts] = useState<AuthOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpTicket, setOtpTicket] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  useEffect(() => {
    void api.options().then(setOpts).catch(() => undefined);
  }, []);

  function validateRegister(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (realName.trim().length < 2) return "Enter your real name (at least 2 characters).";
    if (password.length < 8) return "Password must be at least 8 characters.";
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 99) return "Age must be a whole number between 18 and 99.";
    if (!gender) return "Select a gender.";
    if (gender === "MALE" && partnerUsername.trim().length < 3)
      return "Male players must enter an enrolled female partner username.";
    if (!country || !state || !region || !area) return "Select country, state, region, and area.";
    if (bio.length > 280) return "Bio must be 280 characters or fewer.";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (otpTicket) {
      await onVerifyOtp(e);
      return;
    }
    setError(null);
    if (mode === "register") {
      const invalid = validateRegister();
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const data = await api.login({ identifier, password });
        setAuth(data.token, data.user);
        const me = await api.me();
        setOwned(me.titles);
      } else {
        const data = await api.register({
          email,
          password,
          bio,
          realName,
          gender,
          age: Number(age),
          bloodType,
          country,
          state,
          region,
          area,
          partnerUsername: gender === "MALE" ? partnerUsername : "",
          ageConfirmed: true,
          privacyAccepted: true,
          termsAccepted: true,
        });
        if (data.ticket) {
          setOtpTicket(data.ticket);
          setOtp("");
          setNotice(data.message);
        } else {
          setNotice(data.message);
        }
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!otpTicket) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.verifyOtp(otpTicket, otp);
      setNotice(data.message);
      setOtpTicket(null);
      setOtp("");
      setLockUntil(null);
      setMode("login");
      setIdentifier(email);
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      const wait = (err as Error & { retryAfter?: number }).retryAfter;
      if (typeof wait === "number" && wait > 0) {
        setLockUntil(Date.now() + wait * 1000);
      } else if (msg.toLowerCase().includes("four hours") || msg.toLowerCase().includes("locked")) {
        setLockUntil(Date.now() + 4 * 60 * 60 * 1000);
      }
    } finally {
      setBusy(false);
    }
  }

  const locked = Boolean(lockUntil && lockUntil > Date.now());

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HudFX />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <p className="hud-live font-display text-xs tracking-[0.55em] text-cyan">SECTOR 09 // LIVE GRID</p>
          <p className="glitch mt-4 font-display text-5xl font-black text-white md:text-7xl" data-text="GAIYA SYSTEM">
            GAIYA SYSTEM
          </p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.42em] text-mag/80">NEURAL UPLINK // AUTH GATE</p>
        </div>
        <div className="hologram w-full max-w-xl">
          <form onSubmit={onSubmit} className="hud-panel max-h-[78vh] overflow-y-auto p-8">
            {!otpTicket && (
            <div className="mb-6 grid grid-cols-2 gap-2">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`hud-btn min-h-[44px] rounded-sm px-4 py-2 text-xs ${mode === m ? "hud-btn-fill" : ""}`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            )}
            {mode === "register" && !otpTicket && (
              <>
                <p className="mb-4 text-sm text-white/70">Username is assigned by the system. Email must be unique. Real name is required and visible only to admins.</p>
                <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@nexus.local" type="email" />
                <Field label="REAL NAME (REQUIRED, ADMIN-ONLY)" value={realName} onChange={setRealName} placeholder="Legal name" />
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <Select label="GENDER" value={gender} onChange={setGender} options={opts?.genders ?? [{ id: "FEMALE", label: "Female" }, { id: "MALE", label: "Male" }]} />
                  <Field label="AGE" value={age} onChange={setAge} placeholder="18" />
                </div>
                {gender === "MALE" && (
                  <Field label="PARTNER USERNAME (FEMALE, ENROLLED)" value={partnerUsername} onChange={setPartnerUsername} placeholder="ShadowBlade2291" />
                )}
                <Select
                  label="BLOOD TYPE (OPTIONAL)"
                  value={bloodType}
                  onChange={setBloodType}
                  options={[{ id: "", label: "Skip" }, ...(opts?.bloodTypes ?? []).map((b) => ({ id: b, label: b }))]}
                />
                <Select label="COUNTRY" value={country} onChange={setCountry} options={opts?.countries ?? []} />
                <Select label="STATE" value={state} onChange={setState} options={opts?.states ?? []} />
                <Select label="REGION" value={region} onChange={setRegion} options={opts?.regions ?? []} />
                <Select label="AREA" value={area} onChange={setArea} options={opts?.areas ?? []} />
                <Field label="BIO" value={bio} onChange={setBio} placeholder="Jacked in from the outer rim." />
              </>
            )}
            {mode === "login" && !otpTicket && (
              <Field
                label="EMAIL OR ASSIGNED HANDLE"
                value={identifier}
                onChange={setIdentifier}
                placeholder="operator@gaiya.local"
                autoComplete="username"
              />
            )}
            {!otpTicket && (
              <Field
                label="PASSWORD"
                value={password}
                onChange={setPassword}
                placeholder="********"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            )}
            {mode === "register" && !otpTicket && (
              <div className="mb-4 space-y-2 text-sm text-white/80">
                <label className="flex min-h-[44px] items-start gap-2">
                  <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} required />
                  <span>I confirm I am 18 or older. Gaiya System does not serve children.</span>
                </label>
                <label className="flex min-h-[44px] items-start gap-2">
                  <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} required />
                  <span>
                    I agree to the{" "}
                    <Link href="/privacy" className="text-cyan underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex min-h-[44px] items-start gap-2">
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} required />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" className="text-cyan underline">
                      Terms of Service
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}
            {mode === "login" && !otpTicket && (
              <p className="mb-4 text-sm">
                <Link href="/forgot" className="text-cyan underline">
                  Forgot password
                </Link>
              </p>
            )}
            {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
            {notice && <p className="mb-4 text-sm text-gold">{notice}</p>}
            {otpTicket ? (
              <>
                <p className="mb-4 text-sm text-white/70">Enter the date OTP to activate this operator. Three wrong codes lock the gate for four hours; after that each try is one shot every four hours.</p>
                <Field label="DATE OTP" value={otp} onChange={setOtp} placeholder="OTP" />
                {locked && <p className="mb-4 text-sm text-rose-400">OTP locked. Wait four hours for the next attempt.</p>}
                <button
                  disabled={busy || locked || !otp.trim()}
                  className="hud-btn hud-btn-fill min-h-[48px] w-full rounded-sm py-3 text-sm"
                >
                  {busy ? "CHECKING..." : "CONFIRM OTP"}
                </button>
              </>
            ) : (
              <button
                disabled={busy || (mode === "register" && (!ageConfirmed || !privacyAccepted || !termsAccepted))}
                className="hud-btn hud-btn-fill min-h-[48px] w-full rounded-sm py-3 text-sm"
              >
                {busy ? "LINKING..." : mode === "login" ? "ENTER GRID" : "CREATE OPERATOR"}
              </button>
            )}
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function describeError(err: unknown): string {
  if (!(err instanceof Error)) return "Auth failed";
  const meta = err as Error & { status?: number; retryAfter?: number; fieldErrors?: Record<string, string[]> };
  if (meta.fieldErrors && Object.keys(meta.fieldErrors).length > 0) {
    return Object.entries(meta.fieldErrors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join(" | ");
  }
  if (meta.status === 429) {
    const mins = meta.retryAfter ? Math.ceil(meta.retryAfter / 60) : null;
    return mins ? `Too many attempts. Try again in about ${mins} minute(s).` : "Too many attempts. Try again later.";
  }
  return err.message;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === "email" ? "email" : "on")}
        className="hud-input rounded-sm px-3 py-2.5 text-base"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block font-display text-[10px] tracking-[0.3em] text-gold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="hud-select rounded-sm px-3 py-2.5 text-base">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
