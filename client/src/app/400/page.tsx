import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "400 Bad Request", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["400"];
  return <StatusPage code="400" title={copy.title} message={copy.message} />;
}
