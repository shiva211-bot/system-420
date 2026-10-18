import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Gaiya",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#05010c",
    theme_color: "#05010c",
    lang: "en",
    orientation: "any",
    icons: [{ src: "/system-bg.png", sizes: "512x512", type: "image/png" }],
  };
}
