import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * `not_configured` is kept distinct from `failed` on purpose: a missing secret
 * is the operator's problem, and telling a patient they look like a robot
 * because of a deployment mistake is both wrong and impossible to debug.
 */
export type TurnstileResult = "ok" | "failed" | "not_configured";

/**
 * Validates a Cloudflare Turnstile token server-side.
 *
 * Fails closed: an unverified token is rejected rather than waved through,
 * because this is the only bot gate in front of a form open to the internet.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string | undefined,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "not_configured";
  if (!token) return "failed";

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (data.success === true) return "ok";

    // A bad/missing secret is a configuration fault, not a suspicious visitor.
    const codes = data["error-codes"] ?? [];
    if (
      codes.includes("invalid-input-secret") ||
      codes.includes("missing-input-secret")
    ) {
      console.error("[turnstile] TURNSTILE_SECRET_KEY is invalid:", codes);
      return "not_configured";
    }
    return "failed";
  } catch (err) {
    // Cloudflare unreachable — treat as a fault on our side, not the visitor's.
    console.error("[turnstile] verification request failed:", err);
    return "not_configured";
  }
}
