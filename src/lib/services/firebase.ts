import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
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
} from "@/types";
import { isoWeekKey } from "@/lib/utils/time";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type { BackendServices } from "./types";

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
      async signInWithGoogle() {
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        try {
          const cred = await signInWithPopup(auth, provider);
          return toAuthUser(cred.user);
        } catch (err: unknown) {
          // Popup-blocked environments (some WebViews) fall back to redirect;
          // the result arrives through onAuthStateChanged after reload.
          const code = (err as { code?: string }).code ?? "";
          if (code.includes("popup")) {
            await signInWithRedirect(auth, provider);
          }
          throw err;
        }
      },
      async signInAsGuest() {
        const cred = await signInAnonymously(getFirebaseAuth());
        return toAuthUser(cred.user);
      },
      async signOutUser() {
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
