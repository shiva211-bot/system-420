"use client";

const TICKER = [
  "GAIYA UPLINK STABLE",
  "SECTOR 09 LIVE",
  "WORLD CHANNEL ACTIVE",
  "WALLET ATOMIC LOCK",
  "QUARTERS GRID SYNC",
  "OPERATOR PRESENCE ON",
  "MESSAGE TTL 01:00:00",
  "NO FILTER // RAW PAYLOAD",
];

export function HudFX() {
  const line = TICKER.concat(TICKER).join("   //   ");
  return (
    <div className="hud-bg" aria-hidden>
      <img src="/system-bg.png" alt="" />
      <div className="hud-grid" />
      <div className="scanlines absolute inset-0" />
      <span className="orb left-[8%] top-[18%] h-24 w-24 bg-cyan/25" />
      <span className="orb right-[12%] top-[28%] h-32 w-32 bg-vio/20" style={{ animationDelay: "1.2s" }} />
      <span className="orb bottom-[12%] left-[40%] h-20 w-20 bg-mag/20" style={{ animationDelay: "0.6s" }} />
      <div className="ticker absolute bottom-0 left-0 right-0 z-10 py-1">
        <div className="ticker-track font-mono text-[10px] tracking-[0.35em] text-cyan/80">
          <span className="px-8">{line}</span>
          <span className="px-8">{line}</span>
        </div>
      </div>
    </div>
  );
}
