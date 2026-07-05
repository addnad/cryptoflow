import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useSettings } from "@/stores/settings";

export const isNative = (): boolean => Capacitor.isNativePlatform();

export type HapticCue = "light" | "medium" | "heavy" | "success" | "error";

/**
 * Fire a haptic cue, respecting the player's settings. Falls back to the
 * Vibration API on the web so game-feel survives in dev/browser builds.
 */
export async function haptic(cue: HapticCue): Promise<void> {
  if (!useSettings.getState().haptics) return;
  try {
    if (isNative()) {
      switch (cue) {
        case "light":
          return void (await Haptics.impact({ style: ImpactStyle.Light }));
        case "medium":
          return void (await Haptics.impact({ style: ImpactStyle.Medium }));
        case "heavy":
          return void (await Haptics.impact({ style: ImpactStyle.Heavy }));
        case "success":
          return void (await Haptics.notification({
            type: NotificationType.Success,
          }));
        case "error":
          return void (await Haptics.notification({
            type: NotificationType.Error,
          }));
      }
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const ms = cue === "light" ? 8 : cue === "medium" ? 16 : 28;
      navigator.vibrate(ms);
    }
  } catch {
    // Haptics are decorative — never let them break gameplay.
  }
}

/** Immersive dark status bar over the game surface. */
export async function setupStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0b0e17" });
  } catch {
    // Not available on this platform (e.g. iPad multitasking) — ignore.
  }
}

/**
 * Map the Android hardware back button to in-app navigation.
 * Returns an unsubscribe function.
 */
export function onHardwareBack(handler: () => void): () => void {
  if (!isNative()) return () => undefined;
  const sub = App.addListener("backButton", handler);
  return () => {
    void sub.then((s) => s.remove());
  };
}

/**
 * Observe foreground/background transitions. On the web this maps to the
 * Page Visibility API so a run pauses when the tab is hidden too.
 * Returns an unsubscribe function.
 */
export function onAppStateChange(
  handler: (isActive: boolean) => void,
): () => void {
  if (isNative()) {
    const sub = App.addListener("appStateChange", ({ isActive }) =>
      handler(isActive),
    );
    return () => {
      void sub.then((s) => s.remove());
    };
  }
  if (typeof document === "undefined") return () => undefined;
  const onVisibility = () => handler(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}
