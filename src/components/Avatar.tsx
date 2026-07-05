"use client";

import { avatarById } from "@/features/onboarding/avatars";

interface AvatarProps {
  avatarId: string;
  size?: number;
  className?: string;
}

/**
 * Procedural avatar portrait — a runner silhouette bust against a soft
 * radial glow in the avatar's accent colour. Three head silhouettes are
 * derived from the id so the roster reads as distinct characters while
 * staying perfectly on-brand with the in-game silhouette.
 */
export function Avatar({ avatarId, size = 56, className = "" }: AvatarProps) {
  const def = avatarById(avatarId);
  const variant =
    Math.abs(
      [...def.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7),
    ) % 3;

  // Head silhouettes: 0 = hood, 1 = short crop, 2 = tied-back hair.
  const heads = [
    "M32 14c-7 0-11 5-11 11v5c0 2 1 3.4 3 3.9 2.6.7 13.4.7 16 0 2-.5 3-1.9 3-3.9v-5c0-6-4-11-11-11z",
    "M32 15c-5.4 0-9 3.8-9 9v4.6c0 2.4 1.4 3.8 3.6 4.2 2 .4 8.8.4 10.8 0 2.2-.4 3.6-1.8 3.6-4.2V24c0-5.2-3.6-9-9-9z",
    "M32 15c-5 0-8.6 3.4-8.6 8.4v4.8c0 2.6 1.6 4 3.8 4.3 1.8.3 7.8.3 9.6 0 2.2-.3 3.8-1.7 3.8-4.3v-3.4c2.4-.6 3.4-2.6 2.6-4.8-.7-2-2.2-2.6-3.4-2.6-1.2-1.6-4-2.4-7.8-2.4z",
  ] as const;

  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <defs>
          <radialGradient id={`glow-${def.id}`} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor={def.accent} stopOpacity="0.55" />
            <stop offset="55%" stopColor={def.accent} stopOpacity="0.16" />
            <stop offset="100%" stopColor="#10141f" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" fill="#10141f" />
        <rect width="64" height="64" fill={`url(#glow-${def.id})`} />
        {/* shoulders */}
        <path
          d="M12 64c0-12 8.5-19 20-19s20 7 20 19z"
          fill="#0b0e17"
        />
        {/* head */}
        <path d={heads[variant]} fill="#0b0e17" />
        {/* accent rim light on the shoulder line */}
        <path
          d="M14.5 60c1.6-8.6 8.6-13.4 17.5-13.4S47.9 51.4 49.5 60"
          stroke={def.accent}
          strokeOpacity="0.5"
          strokeWidth="1.4"
          fill="none"
        />
      </svg>
    </div>
  );
}
