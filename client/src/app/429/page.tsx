import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";

export const metadata: Metadata = { title: "429 Too Many Requests", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <StatusPage
      code="429"
      title="Too many requests"
      message="This uplink is rate-limited. Wait, then retry. Auth and chat windows reset on their own timers."
    />
  );
}
