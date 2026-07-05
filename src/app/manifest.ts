import type { MetadataRoute } from "next";

// Emit the manifest as a static file for `output: export`.
export const dynamic = "force-static";

/**
 * PWA manifest — lets the exported web build install to a home screen with
 * proper icons, portrait lock and the ink theme, matching the native shells.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crypto Flow",
    short_name: "Crypto Flow",
    description: "Outrun the Bear Market. A cinematic crypto endless runner.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0e17",
    theme_color: "#0b0e17",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
