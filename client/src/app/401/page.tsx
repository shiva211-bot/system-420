import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export const metadata: Metadata = { title: "401 Unauthorized", robots: { index: false, follow: false } };

export default function Page() {
  const copy = STATUS_PAGES["401"];
  return <StatusPage code="401" title={copy.title} message={copy.message} actionHref="/" actionLabel="SIGN IN" />;
}
