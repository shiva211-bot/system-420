import type { Metadata } from "next";

export const metadata: Metadata = { title: "Forgot password", alternates: { canonical: "/forgot" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
