import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

const paths = [
  "/",
  "/privacy",
  "/terms",
  "/refund",
  "/cookies",
  "/licenses",
  "/delete-data",
  "/unsubscribe",
  "/accessibility",
  "/grievance",
  "/impressum",
  "/dmca",
  "/do-not-sell",
  "/forgot",
  "/reset",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${SITE.url}${path === "/" ? "" : path}`,
    lastModified: new Date("2026-10-10"),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.4,
  }));
}
