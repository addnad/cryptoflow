import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Flow",
  description:
    "Outrun the Bear Market. A cinematic endless runner through volatile crypto skylines.",
  applicationName: "Crypto Flow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Crypto Flow",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0e17",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
