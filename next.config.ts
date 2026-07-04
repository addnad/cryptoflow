import type { NextConfig } from "next";

/**
 * CRYPTO FLOW ships as a fully static bundle so Capacitor can wrap the
 * exported `out/` directory into native iOS/Android shells. All backend
 * interaction happens client-side through the services layer.
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
