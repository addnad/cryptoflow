import type { AvatarDef } from "@/types";

/**
 * Avatar roster. Portraits are rendered procedurally by <Avatar /> —
 * a silhouette bust tinted with the avatar accent, so every choice stays
 * on-brand with the in-game character.
 */
export const AVATARS: readonly AvatarDef[] = [
  {
    id: "drift",
    name: "Drift",
    accent: "#e8a33d",
    bio: "Rides volatility like wind.",
  },
  {
    id: "ledger",
    name: "Ledger",
    accent: "#7f9cf5",
    bio: "Never forgets an entry.",
  },
  {
    id: "nova",
    name: "Nova",
    accent: "#c084fc",
    bio: "Burns brightest at the top.",
  },
  {
    id: "sable",
    name: "Sable",
    accent: "#4cc38a",
    bio: "Moves quietly through markets.",
  },
  {
    id: "oracle",
    name: "Oracle",
    accent: "#38bdf8",
    bio: "Saw the dip coming.",
  },
  {
    id: "ronin",
    name: "Ronin",
    accent: "#e2565c",
    bio: "No exchange holds them.",
  },
] as const;

export function avatarById(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
