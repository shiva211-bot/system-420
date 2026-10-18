import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "410 Gone", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["410"];
  return <StatusPage code="410" title={copy.title} message={copy.message} />;
}
