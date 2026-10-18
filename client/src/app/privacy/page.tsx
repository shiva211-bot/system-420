import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>Last updated: 12 October 2026. Operator: {SITE.legalName}, {SITE.headquarters}. Contact: {SITE.privacyEmail}.</p>
      <p>
        This notice is written in plain language. A Hindi summary follows the English text. Gaiya System is a private operator
        grid. It is not a shop, bank, government service, or advertising network.
      </p>
      <h2 className="font-display text-xl text-white">What we process</h2>
      <p>
        Account data you submit: email, password hash, system username, real name (visible to admins only), gender, age,
        optional blood type, country/state/region/area, optional bio, partner username if you are male, in-grid wallets,
        friends, organisations, tasks, deeds, and chat messages. Chat messages auto-delete after one hour. We also process
        the IP address of API and socket requests for rate limits, session security, and abuse response. We do not collect
        payment cards, government IDs, or browsing history from advertising pixels.
      </p>
      <h2 className="font-display text-xl text-white">What we do not do</h2>
      <p>
        We do not sell personal data. We do not share personal data for cross-context behavioural advertising. We do not run
        advertising, social, or analytics SDKs. There is no “Do Not Sell” toggle because we do not sell or share for ads; the
        statutory California link is still published at /do-not-sell.
      </p>
      <h2 className="font-display text-xl text-white">Legal bases</h2>
      <p>
        Contract: to create and run your operator account. Consent: optional fields (blood type, bio) and the age, privacy,
        and terms checkboxes at registration. Legitimate interest: security, fraud prevention, and abuse response. We do not
        rely on consent for the strictly necessary session cookie.
      </p>
      <h2 className="font-display text-xl text-white">Children</h2>
      <p>
        Gaiya System is for adults. You must be {SITE.ageMinimum} or older. We do not knowingly collect data from children.
        We do not obtain parental consent because we do not target under-{SITE.ageMinimum} users. If we learn an account
        belongs to a child, we delete it. Parents or guardians may write to {SITE.privacyEmail}.
      </p>
      <h2 className="font-display text-xl text-white">Your rights (DPDP, GDPR, CCPA/CPRA)</h2>
      <p>
        You may request access, correction, deletion, restriction, or a copy of your data. California residents may use the
        “Do Not Sell or Share My Personal Information” link. EU/UK users may object to processing based on legitimate
        interest and lodge a complaint with a supervisory authority. Use /delete-data, the in-grid account delete control, or
        email {SITE.privacyEmail}.
      </p>
      <h2 className="font-display text-xl text-white">Nomination (DPDP)</h2>
      <p>
        You may nominate another adult to exercise your data rights if you die or become incapacitated. Send the nominee’s
        name, email, and your account email to {SITE.privacyEmail}. We will record the nomination against your account and
        honour a verified request from that person with proof of authority.
      </p>
      <h2 className="font-display text-xl text-white">Retention and security</h2>
      <p>
        Active accounts until you delete them or an admin removes them; deactivated accounts until reactivation or deletion;
        deletion requests until processed; security logs for a limited operational period. Passwords are bcrypt hashed.
        Sessions use HttpOnly cookies and a token version that logout, reset, deactivate, and delete bump. We do not store
        raw payment cards. Transfers of in-grid currency are atomic database transactions.
      </p>
      <h2 className="font-display text-xl text-white">Hindi summary / हिंदी सार</h2>
      <p>
        गैया सिस्टम एक निजी ऑपरेटर ग्रिड है। हम ईमेल, पासवर्ड हैश, सिस्टम यूज़रनेम, उम्र, लिंग, स्थान और चैट संदेश संसाधित करते
        हैं। चैट एक घंटे बाद हट जाता है। हम विज्ञापन या एनालिटिक्स कुकी नहीं लगाते। आपकी उम्र {SITE.ageMinimum} वर्ष या अधिक होनी
        चाहिए। डेटा अधिकार, नामांकन, या हटाने के लिए {SITE.privacyEmail} पर लिखें या /delete-data का उपयोग करें।
      </p>
    </LegalShell>
  );
}
