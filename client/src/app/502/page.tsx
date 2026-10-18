import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "502 Bad Gateway", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["502"];
  return <StatusPage code="502" title={copy.title} message={copy.message} />;
}
