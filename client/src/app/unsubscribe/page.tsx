import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Unsubscribe", alternates: { canonical: "/unsubscribe" } };

export default function UnsubscribePage() {
  return (
    <LegalShell title="Unsubscribe">
      <p>
        Gaiya System does not send marketing email. The only mail we send is transactional: password reset and data-deletion
        notices that you requested. Operator activation uses an on-site date OTP, not a marketing list.
      </p>
      <p>
        There is no newsletter list to leave. If you received a message you did not request, write to {SITE.email} and we
        will investigate.
      </p>
    </LegalShell>
  );
}
