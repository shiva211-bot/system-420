import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Copyright / DMCA", alternates: { canonical: "/dmca" } };

export default function DmcaPage() {
  return (
    <LegalShell title="Copyright notices">
      <p>Last updated: 12 October 2026. Designated agent: {SITE.dmcaEmail}.</p>
      <p>
        Player chat and deeds are hosted as user content. To request removal of material you own under the US Digital
        Millennium Copyright Act or India IT Act section 79, email {SITE.dmcaEmail} with: your contact details; a description
        of the work; the location of the material on this grid (channel, approximate time, and text if still available);
        a statement that you have a good-faith belief the use is not authorised; a statement under penalty of perjury that
        the information is accurate and that you are the owner or authorised agent; and your physical or electronic
        signature.
      </p>
      <p>
        Chat auto-deletes after one hour, so some notices will concern material that is already gone. We still log the
        notice. Repeat infringers may lose their account. Counter-notices may be sent to the same address. This page does
        not make {SITE.legalName} the author of player messages.
      </p>
    </LegalShell>
  );
}
