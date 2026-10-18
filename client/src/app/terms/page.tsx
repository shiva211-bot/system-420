import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>Last updated: 12 October 2026. These terms are between you and {SITE.legalName}.</p>
      <h2 className="font-display text-xl text-white">Eligibility</h2>
      <p>
        You must be {SITE.ageMinimum} or older. You are responsible for your credentials and for content you send on world
        and private channels. Messages are unfiltered payloads and expire after one hour.
      </p>
      <h2 className="font-display text-xl text-white">No paid goods</h2>
      <p>
        In-grid currencies have no cash value and are not sold by Gaiya System. There are no paid upgrades, loot boxes, title
        shops, subscriptions, or auto-renewals. Rank is a position assigned by operators.
      </p>
      <h2 className="font-display text-xl text-white">Account control</h2>
      <p>
        We may suspend or delete accounts that abuse the grid. You may deactivate or permanently delete your own non-admin
        account from the player console, or request deletion at /delete-data.
      </p>
      <h2 className="font-display text-xl text-white">Intellectual property</h2>
      <p>
        The Gaiya System name, HUD, layout, code, /system-bg.png, /india-quarters.png, /boot.mp4, and related marks belong to
        {SITE.legalName}. You keep rights in content you type. You grant us a limited licence to host that content only to
        operate the grid, including the one-hour chat window.
      </p>
      <h2 className="font-display text-xl text-white">User content and notice-and-takedown</h2>
      <p>
        World and private chat are operator-typed payloads. Copyright owners may send takedown notices to {SITE.dmcaEmail}
        under the US DMCA and India IT Act section 79. Details: /dmca. We are a host, not the author of player messages.
      </p>
      <h2 className="font-display text-xl text-white">Limitation of liability</h2>
      <p>
        The service is provided as-is for private grid use. To the maximum extent permitted by law, {SITE.legalName} is not
        liable for lost profits, lost data, server downtime, chat expiry, wallet mistakes you authorised, or consequential
        damages. Our total liability for any claim relating to the grid is limited to zero, because we do not charge a fee.
        Nothing in these terms limits liability that cannot be limited under applicable law, including fraud or death or
        personal injury caused by negligence where that limit is forbidden.
      </p>
      <h2 className="font-display text-xl text-white">Governing law and jurisdiction</h2>
      <p>
        These terms are governed by the laws of {SITE.governingLaw}. Exclusive jurisdiction: {SITE.jurisdiction}. The grid
        does not claim real-world military, government, or financial status. Support: {SITE.supportEmail}.
      </p>
    </LegalShell>
  );
}
