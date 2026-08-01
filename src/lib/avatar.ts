/**
 * Deterministic initials + colour for a patient, so the same person always
 * gets the same chip and the list stays scannable at a glance.
 */

const PALETTE = [
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
] as const;

export function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export function avatarColor(seed: string | number): string {
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
