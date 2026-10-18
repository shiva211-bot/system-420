import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Grievance officer", alternates: { canonical: "/grievance" } };

export default function GrievancePage() {
  return (
    <LegalShell title="Grievance officer">
      <p>Last updated: 12 October 2026. Published under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as applicable.</p>
      <p>
        Designated grievance officer: {SITE.grievanceOfficer}. Direct email: {SITE.grievanceEmail}. Postal address:{" "}
        {SITE.headquarters}. Customer care: {SITE.customerCare}.
      </p>
      <p>
        Send your name, account email or assigned handle if you have one, a description of the complaint, and any URLs or
        message times. We acknowledge complaints by email within 48 hours of receipt at {SITE.grievanceEmail}. We aim to
        dispose of the complaint within the period required by the applicable IT Rules.
      </p>
      <p>
        This channel covers account access, data rights, abuse of the grid, and intermediary takedown follow-up. Copyright
        notices should also copy {SITE.dmcaEmail} using the process on /dmca.
      </p>
    </LegalShell>
  );
}
