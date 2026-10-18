import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <StatusPage
      code="OFFLINE"
      title="No uplink"
      message="This device has no network path to the grid. Reconnect, then reload. Cached operator tools stay local until the channel returns."
      actionLabel="RETRY CONNECTION"
    />
  );
}
