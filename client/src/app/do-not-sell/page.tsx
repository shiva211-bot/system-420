import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Do Not Sell or Share My Personal Information", alternates: { canonical: "/do-not-sell" } };

export default function DoNotSellPage() {
  return (
    <LegalShell title="Do Not Sell or Share My Personal Information">
      <p>Last updated: 12 October 2026. This page is the California CPRA / CCPA consumer opt-out link.</p>
      <p>
        {SITE.legalName} does not sell personal information and does not share personal information for cross-context
        behavioural advertising. We do not run advertising or analytics SDKs. There is no sale or share to turn off.
        Submitting this notice still records your preference.
      </p>
      <p>
        California residents may also request access, deletion, or correction at /delete-data or {SITE.privacyEmail}. We
        will not discriminate against you for exercising these rights. We do not use sensitive personal information to infer
        characteristics for advertising.
      </p>
      <p>
        If you use a browser global privacy control (GPC) signal, treat this grid as already opted out of sale/share: we do
        not sell or share. Authorized agents may email {SITE.privacyEmail} with proof of authority.
      </p>
    </LegalShell>
  );
}
