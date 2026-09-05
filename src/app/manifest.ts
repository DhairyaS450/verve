import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verve",
    short_name: "Verve",
    description: "Daily communication training. Fifteen minutes. One fix at a time.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f3f1ec",
    theme_color: "#f3f1ec",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
