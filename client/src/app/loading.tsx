import { HudFX } from "@/components/HudFX";

export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <HudFX />
      <div className="relative z-10 flex flex-col items-center gap-4" role="status" aria-live="polite" aria-label="Loading">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan/25 border-t-cyan shadow-neon" />
        <p className="font-mono text-[11px] tracking-[0.4em] text-cyan/80">ROUTING UPLINK</p>
      </div>
    </div>
  );
}
