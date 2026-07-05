/**
 * CRYPTO FLOW — Cloud Functions.
 *
 * Two server-side responsibilities the client cannot be trusted with:
 *  1. Score validation: every leaderboard write is sanity-checked against
 *     the player's recorded run (max plausible score per second of play);
 *     implausible entries are flagged and removed.
 *  2. Weekly rollover: a scheduled job seeds the next ISO-week leaderboard
 *     collection so subscriptions never hit a cold, unindexed path.
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = getFirestore();

/**
 * Upper bound on legitimate scoring rate. The client caps event score at
 * 400 * 4 (combo cap) * 1.6 (momentum) * 1.5 (perfect) ≈ 3840 per gate at
 * peak difficulty (~2 gates/s), plus distance trickle — 9000 pts/s is far
 * beyond reach and leaves headroom against false positives.
 */
const MAX_SCORE_PER_SECOND = 9000;
const MAX_SCORE_ABSOLUTE = 50_000_000;

export const validateLeaderboardEntry = onDocumentWritten(
  "leaderboards/{board}/entries/{uid}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const entry = after.data() as { uid: string; score: number };
    const { board, uid } = event.params;

    if (entry.uid !== uid) {
      await after.ref.delete();
      return;
    }
    if (entry.score > MAX_SCORE_ABSOLUTE) {
      await flagAndRemove(board, uid, entry.score, "absolute-cap");
      return;
    }

    // Compare against the best recorded run for this player.
    const runs = await db
      .collection(`players/${uid}/runs`)
      .orderBy("score", "desc")
      .limit(1)
      .get();
    if (runs.empty) return; // nothing to compare yet — allow

    const best = runs.docs[0]!.data() as {
      score: number;
      durationMs: number;
    };
    const seconds = Math.max(1, best.durationMs / 1000);
    if (best.score / seconds > MAX_SCORE_PER_SECOND) {
      await flagAndRemove(board, uid, entry.score, "rate-cap");
    }
  },
);

async function flagAndRemove(
  board: string,
  uid: string,
  score: number,
  reason: string,
): Promise<void> {
  await db.collection("moderation").add({
    type: "suspicious-score",
    board,
    uid,
    score,
    reason,
    at: Date.now(),
  });
  await db.doc(`leaderboards/${board}/entries/${uid}`).delete();
}

function isoWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

/** Every Monday 00:05 UTC: stamp the fresh weekly board's metadata doc. */
export const weeklyRollover = onSchedule("5 0 * * 1", async () => {
  const key = isoWeekKey(new Date());
  await db.doc(`leaderboards/weekly-${key}`).set(
    { createdAt: Date.now(), week: key },
    { merge: true },
  );
});
