import { firebaseConfigured } from "@/lib/firebase/client";
import { createLocalServices } from "./local";
import type { BackendServices } from "./types";

let instance: BackendServices | null = null;
let loading: Promise<BackendServices> | null = null;

/**
 * Resolve the backend for this build. Firebase when configured; otherwise
 * the local adapter. The Firebase adapter is loaded lazily so offline
 * builds never pay its bundle cost at startup.
 */
export async function services(): Promise<BackendServices> {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      if (firebaseConfigured) {
        const { createFirebaseServices } = await import("./firebase");
        instance = createFirebaseServices();
      } else {
        instance = createLocalServices();
      }
      return instance;
    })();
  }
  return loading;
}

export type { BackendServices } from "./types";
