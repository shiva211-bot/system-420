import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Licenses", alternates: { canonical: "/licenses" } };

export default function LicensesPage() {
  return (
    <LegalShell title="Font and image licenses">
      <p>
        Fonts: Orbitron, Rajdhani, and JetBrains Mono are loaded from Google Fonts under the SIL Open Font License. Source:
        fonts.google.com.
      </p>
      <p>
        Images: /system-bg.png is the Gaiya System handshake artwork used as the HUD background. /india-quarters.png is the
        operator quarters map. /boot.mp4 is the boot intro. These assets are used only inside this product.
      </p>
      <p>Icons: Lucide React (ISC license). No stock photography or third-party character art is bundled.</p>
    </LegalShell>
  );
}
