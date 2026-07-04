"use client";

import dynamic from "next/dynamic";

/**
 * The whole app is a client-side shell (screen state machine + Phaser).
 * Rendering it only in the browser keeps the static export trivially
 * hydratable and lets systems touch window/WebAudio/Capacitor freely.
 */
const AppShell = dynamic(() => import("@/features/shell/AppShell"), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return <AppShell />;
}
