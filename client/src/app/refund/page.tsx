import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Refund Policy", alternates: { canonical: "/refund" } };

export default function RefundPage() {
  return (
    <LegalShell title="Refund Policy">
      <p>Last updated: 12 October 2026.</p>
      <p>
        Gaiya System does not sell subscriptions, coins, titles, physical goods, or imported goods. There is no checkout, no
        auto-renewal, and no payment card is stored on this host. In-grid currencies are granted inside the simulation and
        have no cash value. There are no fees and therefore no refunds, returns, or cancellation windows to process.
      </p>
      <p>
        If a future paid product is introduced, this page will be updated before any charge is taken, with a clear price,
        billing cycle, cancellation path, and a refund path that honours the Consumer Protection Act, 2019 where it applies.
        Customer care: {SITE.customerCare}. Legal name: {SITE.legalName}. Headquarters: {SITE.headquarters}.
      </p>
    </LegalShell>
  );
}
