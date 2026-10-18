import type { Metadata } from "next";

export const metadata: Metadata = { title: "Delete data", alternates: { canonical: "/delete-data" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
