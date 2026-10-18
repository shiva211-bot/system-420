import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "500 Internal Server Error", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["500"];
  return <StatusPage code="500" title={copy.title} message={copy.message} />;
}
