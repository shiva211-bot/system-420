import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Legal notice", alternates: { canonical: "/impressum" } };

export default function ImpressumPage() {
  return (
    <LegalShell title="Legal notice / Impressum">
      <p>Last updated: 12 October 2026.</p>
      <p>
        Legal name: {SITE.legalName}. Headquarters: {SITE.headquarters}. Public contact: {SITE.supportEmail}. Privacy:{" "}
        {SITE.privacyEmail}. Grievance: {SITE.grievanceOfficer}, {SITE.grievanceEmail}.
      </p>
      <p>
        Gaiya System is a private operator grid. It is not a registered e-commerce marketplace and does not collect VAT on
        sales because it does not sell goods or subscriptions. There is no company registration number or VAT ID published
        here because no paid checkout exists. If a commercial entity is later formed, this page will list registration
        number, VAT ID, and authorised representatives before any EU charge is taken.
      </p>
      <p>
        Governing law: {SITE.governingLaw}. Jurisdiction: {SITE.jurisdiction}. This notice is provided so German-speaking
        visitors have a single legal-identity page.
      </p>
    </LegalShell>
  );
}
