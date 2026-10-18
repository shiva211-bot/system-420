import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/400",
        "/401",
        "/403",
        "/410",
        "/413",
        "/429",
        "/500",
        "/502",
        "/503",
        "/504",
        "/maintenance",
        "/offline",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
