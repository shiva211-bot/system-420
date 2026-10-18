import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "504 Gateway Timeout", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["504"];
  return <StatusPage code="504" title={copy.title} message={copy.message} />;
}
