import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";

export const metadata: Metadata = { title: "413 Payload Too Large", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <StatusPage
      code="413"
      title="Payload too large"
      message="The request body exceeded the 32kb JSON limit. Shrink the payload and retry."
    />
  );
}
