import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Accessibility", alternates: { canonical: "/accessibility" } };

export default function AccessibilityPage() {
  return (
    <LegalShell title="Accessibility statement">
      <p>Last updated: 12 October 2026. Operator: {SITE.legalName}.</p>
      <p>
        We aim to align the public grid with WCAG 2.2 Level AA. That includes a skip link to main content, visible focus
        outlines, 44px minimum tap targets on primary controls, semantic headings (one H1 per page), form labels, and
        reduced-motion handling for the boot intro and HUD motion. Decorative HUD art uses empty alt text; the quarters map
        has a text alternative.
      </p>
      <p>
        Known limits: the cyberpunk HUD uses high-contrast neon on dark backgrounds. Some animated layers are hidden when
        the operating system requests reduced motion. Chat history is text. If a control, contrast, keyboard path, or
        screen-reader label blocks you, write to {SITE.accessibilityEmail} with the page URL and what you expected. We treat
        that as an accessibility barrier report.
      </p>
      <p>This statement does not certify a formal audit. It describes current engineering intent and how to report gaps.</p>
    </LegalShell>
  );
}
