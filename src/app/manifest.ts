import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Verve",
    short_name: "Verve",
    description: "Daily communication training. Fifteen minutes. One fix at a time.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f3f1ec",
    theme_color: "#f3f1ec",
    orientation: "portrait",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's session", short_name: "Practice", url: "/practice?kind=daily", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Skill tree", short_name: "Skills", url: "/skills", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
