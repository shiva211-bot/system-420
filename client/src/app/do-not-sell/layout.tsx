import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Do Not Sell or Share My Personal Information",
  alternates: { canonical: "/do-not-sell" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
