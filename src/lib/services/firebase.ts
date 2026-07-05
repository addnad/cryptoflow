import {
  GoogleAuthProvider,
  OAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthCredential,
  type AuthProvider,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import type {
  AchievementState,
  AuthUser,
  BoardMetric,
  BoardScope,
  DailyRewardState,
  LeaderboardEntry,
  PlayerProfile,
  RunStats,
  SocialProvider,
} from "@/types";
import { isoWeekKey } from "@/lib/utils/time";
import { isNative } from "@/lib/native";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type { BackendServices } from "./types";

/**
 * Obtain a social OAuth credential from the platform's native sign-in.
 *
 * In a native Capacitor WebView `signInWithPopup` cannot open a browser
 * window, so we drive the platform sign-in through
 * @capacitor-firebase/authentication and hand the resulting id token to the
 * JS SDK (which owns the auth state Firestore reads). On the web this
 * returns null and callers fall back to the popup/redirect flow.
 */
async function nativeCredential(
  provider: SocialProvider,
): Promise<AuthCredential | null> {
  if (!isNative()) return null;
  const { FirebaseAuthentication } = await import(
    "@capacitor-firebase/authentication"
  );
  if (provider === "google") {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("signin-cancelled");
    return GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
  }
  // Apple: the plugin generates + hashes the nonce; we replay the raw nonce.
  const result = await FirebaseAuthentication.signInWithApple();
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("signin-cancelled");
  return new OAuthProvider("apple.com").credential({
    idToken,
    rawNonce: result.credential?.nonce,
  });
}

/** Popup/redirect provider for the web sign-in path. */
function webProvider(provider: SocialProvider): AuthProvider {
  if (provider === "google") return new GoogleAuthProvider();
  const apple = new OAuthProvider("apple.com");
  apple.addScope("email");
  apple.addScope("name");
  return apple;
}

/** Normalise Firebase's link/credential collision codes. */
function mapAuthError(err: unknown): Error {
  const code = (err as { code?: string }).code ?? "";
  if (
    code.includes("credential-already-in-use") ||
    code.includes("email-already-in-use")
  ) {
    return new Error("credential-in-use");
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function socialSignIn(provider: SocialProvider): Promise<AuthUser> {
  const auth = getFirebaseAuth();
  const credential = await nativeCredential(provider);
  if (credential) {
    const cred = await signInWithCredential(auth, credential);
    return toAuthUser(cred.user);
  }
  const provFn = webProvider(provider);
  try {
    const cred = await signInWithPopup(auth, provFn);
    return toAuthUser(cred.user);
  } catch (err: unknown) {
    // Popup-blocked environments (some WebViews) fall back to redirect;
    // the result arrives through onAuthStateChanged after reload.
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("popup")) {
      await signInWithRedirect(auth, provFn);
    }
    throw err;
  }
}

async function socialLink(provider: SocialProvider): Promise<AuthUser> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("no-current-user");
  try {
    const credential = await nativeCredential(provider);
    const result = credential
      ? await linkWithCredential(user, credential)
      : await linkWithPopup(user, webProvider(provider));
    return toAuthUser(result.user);
  } catch (err) {
    throw mapAuthError(err);
  }
}

/**
 * Firebase backend adapter — Auth + Firestore.
 *
 * Collections (see ARCHITECTURE §6):
 *   players/{uid}, usernames/{lower}, players/{uid}/achievements meta doc,
 *   players/{uid}/runs, leaderboards/{global|weekly-<iso>}/entries/{uid},
 *   rewards/{uid}.
 *
 * Scores submitted here are additionally re-validated by Cloud Functions
 * (functions/src/index.ts) before they are trusted for weekly prizes.
 */

function toAuthUser(u: User): AuthUser {
  const providerId = u.providerData[0]?.providerId;
  return {
    uid: u.uid,
    provider: u.isAnonymous
      ? "guest"
      : providerId === "apple.com"
        ? "apple"
        : "google",
    isAnonymous: u.isAnonymous,
    email: u.email,
    photoUrl: u.photoURL,
  };
}

function boardCollection(scope: BoardScope): string {
  // "friends" ranks against the global board client-side (closest rivals)
  // until a social graph ships — both read the same collection.
  if (scope === "weekly") return `leaderboards/weekly-${isoWeekKey()}/entries`;
  return "leaderboards/global/entries";
}

export function createFirebaseServices(): BackendServices {
  return {
    cloud: true,

    auth: {
      onChange(cb) {
        return onAuthStateChanged(getFirebaseAuth(), (u) =>
          cb(u ? toAuthUser(u) : null),
        );
      },
      signInWithGoogle: () => socialSignIn("google"),
      signInWithApple: () => socialSignIn("apple"),
      async signInAsGuest() {
        const cred = await signInAnonymously(getFirebaseAuth());
        return toAuthUser(cred.user);
      },
      linkProvider: (provider) => socialLink(provider),
      async signOutUser() {
        if (isNative()) {
          const { FirebaseAuthentication } = await import(
            "@capacitor-firebase/authentication"
          );
          await FirebaseAuthentication.signOut().catch(() => undefined);
        }
        await signOut(getFirebaseAuth());
      },
    },

    players: {
      async get(uid) {
        const snap = await getDoc(doc(getDb(), "players", uid));
        return snap.exists() ? (snap.data() as PlayerProfile) : null;
      },
      async create(profile) {
        const db = getDb();
        const lower = profile.username.toLowerCase();
        await runTransaction(db, async (tx) => {
          const nameRef = doc(db, "usernames", lower);
          const nameSnap = await tx.get(nameRef);
          if (nameSnap.exists() && nameSnap.data().uid !== profile.uid) {
            throw new Error("username-taken");
          }
          tx.set(nameRef, { uid: profile.uid });
          tx.set(doc(db, "players", profile.uid), profile);
        });
      },
      async update(uid, patch) {
        await updateDoc(doc(getDb(), "players", uid), patch);
      },
      async isUsernameAvailable(username) {
        const snap = await getDoc(
          doc(getDb(), "usernames", username.toLowerCase()),
        );
        return !snap.exists();
      },
    },

    leaderboards: {
      async top(scope, metric: BoardMetric, max) {
        const snap = await getDocs(
          query(
            collection(getDb(), boardCollection(scope)),
            orderBy(metric, "desc"),
            qLimit(max),
          ),
        );
        return snap.docs.map((d) => d.data() as LeaderboardEntry);
      },
      subscribeTop(scope, metric, max, cb) {
        return onSnapshot(
          query(
            collection(getDb(), boardCollection(scope)),
            orderBy(metric, "desc"),
            qLimit(max),
          ),
          (snap) => cb(snap.docs.map((d) => d.data() as LeaderboardEntry)),
          () => cb([]),
        );
      },
      async submit(entry) {
        const db = getDb();
        await Promise.all([
          setDoc(doc(db, boardCollection("global"), entry.uid), entry, {
            merge: true,
          }),
          setDoc(doc(db, boardCollection("weekly"), entry.uid), entry, {
            merge: true,
          }),
        ]);
      },
    },

    achievements: {
      async all(uid) {
        const snap = await getDoc(
          doc(getDb(), "players", uid, "meta", "achievements"),
        );
        return snap.exists()
          ? ((snap.data().states ?? []) as AchievementState[])
          : [];
      },
      async save(uid, states) {
        await setDoc(doc(getDb(), "players", uid, "meta", "achievements"), {
          states,
        });
      },
    },

    rewards: {
      async get(uid) {
        const snap = await getDoc(doc(getDb(), "rewards", uid));
        return snap.exists()
          ? (snap.data() as DailyRewardState)
          : { streak: 0, lastClaimDay: null };
      },
      async set(uid, state) {
        await setDoc(doc(getDb(), "rewards", uid), state);
      },
    },

    runs: {
      async add(uid, stats: RunStats) {
        await addDoc(collection(getDb(), "players", uid, "runs"), stats);
      },
    },
  };
}
