import type { MetadataRoute } from "next";
import { APP_NAME, APP_DESCRIPTION, BRAND_COLOR } from "@/lib/brand";

// PWA manifest — makes Stacks installable to the phone home screen (where the
// ISBN scanner lives) and the desktop. Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Your Library`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f4ead8",
    theme_color: BRAND_COLOR,
    orientation: "portrait-primary",
    categories: ["books", "productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
