import type { Metadata } from "next";

export const metadata: Metadata = { title: "Operator OTP", alternates: { canonical: "/verify" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
