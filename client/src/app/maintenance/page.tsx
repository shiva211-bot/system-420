import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";

export const metadata: Metadata = { title: "Maintenance", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <StatusPage
      code="MAINT"
      title="Grid upgrade in progress"
      message="Gaiya System is offline for a planned upgrade or data migration. Operator wallets and chat are paused. Retry after the window closes."
    />
  );
}
