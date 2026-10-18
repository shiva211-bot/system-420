import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Cookie Policy", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy">
      <p>Last updated: 12 October 2026.</p>
      <p>
        Strictly necessary cookie: nexus_token (HttpOnly, SameSite=Lax). Purpose: keep a signed-in session. Duration: up to 7
        days or until logout. Set by the Gaiya System API. Logout increments the session version so the cookie cannot be
        reused. This cookie is required for the signed-in grid and is not used for advertising.
      </p>
      <p>
        Local storage: gaiya_cookie_consent records that you saw the necessary-cookie notice. It is not a tracking
        identifier. No advertising, social, or analytics cookies are used. Optional tracking scripts are not loaded at all,
        so there is no pre-ticked marketing opt-in and nothing extra to accept.
      </p>
      <p>
        EU/UK visitors: we do not set non-essential cookies. California visitors: we do not sell or share personal
        information as defined by CPRA; see /do-not-sell. You can clear cookies in your browser; doing so signs you out.
        Questions: {SITE.privacyEmail}.
      </p>
    </LegalShell>
  );
}
