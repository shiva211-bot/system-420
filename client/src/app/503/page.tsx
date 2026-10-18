import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "503 Service Unavailable", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["503"];
  return <StatusPage code="503" title={copy.title} message={copy.message} />;
}
