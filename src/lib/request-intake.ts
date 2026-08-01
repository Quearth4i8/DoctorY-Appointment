import "server-only";

import { createHash } from "crypto";

/** Client IP, as seen through whatever proxy/CDN is in front of the app. */
export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

/**
 * Salted hash of an IP. We rate-limit on this instead of the address itself so
 * the table never becomes a log of who visited the doctor's booking page.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Digits only, so "20 123 456" and "20123456" count as the same submitter. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
