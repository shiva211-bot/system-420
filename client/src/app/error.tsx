"use client";

import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const copy = STATUS_PAGES["500"];
  return <StatusPage code="500" title={copy.title} message={copy.message} onAction={reset} actionLabel="RETRY UPLINK" />;
}
