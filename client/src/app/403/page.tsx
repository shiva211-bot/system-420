import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "403 Forbidden", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["403"];
  return <StatusPage code="403" title={copy.title} message={copy.message} />;
}
