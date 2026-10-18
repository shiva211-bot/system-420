"use client";

import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const copy = STATUS_PAGES["500"];
  return (
    <html lang="en">
      <body>
        <StatusPage code="500" title={copy.title} message={copy.message} onAction={reset} actionLabel="RETRY UPLINK" />
      </body>
    </html>
  );
}
