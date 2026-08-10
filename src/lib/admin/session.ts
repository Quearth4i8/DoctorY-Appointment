/**
 * No `next/headers` import here on purpose: this file is also loaded by
 * middleware, which runs on the Edge runtime, so it stays to primitives that
 * work in both places. Route Handlers read the cookie themselves via
 * `requireAdmin()` in ./require-admin.
 */
export const ADMIN_COOKIE_NAME = "doctory_admin_session";

/**
 * String equality that takes the same time regardless of where the strings
 * first differ. Edge middleware has no Node `crypto` module, so this is a
 * plain loop rather than `crypto.timingSafeEqual` — good enough for a login
 * form, not meant to resist a network-level timing attack on its own.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function sessionTokenMatches(cookieValue: string | undefined | null): boolean {
  const expected = process.env.ADMIN_SESSION_TOKEN || "";
  if (!expected || !cookieValue) return false;
  return constantTimeEqual(cookieValue, expected);
}
