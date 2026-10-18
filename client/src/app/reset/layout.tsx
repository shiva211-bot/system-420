import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset password", alternates: { canonical: "/reset" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
