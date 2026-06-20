import type { MetadataRoute } from "next";

// Web App Manifest — lets ClipPilot be "Added to Home Screen" on mobile and
// run in a standalone, app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClipPilot — video repair toolbox",
    short_name: "ClipPilot",
    description:
      "Stabilise, compress, convert and trim short videos — processed locally.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1f66f0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
