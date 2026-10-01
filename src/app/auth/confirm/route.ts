import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where a Supabase email link comes back to — email change today, and any
 * other confirmation link pointed here later.
 *
 * Without it the link landed on /profil carrying a one-time `code` nothing
 * read, so clicking "Confirm new email address" appeared to do nothing. This
 * finishes whichever form the link arrives in, then hands off to `next` with
 * an `auth` flag the page turns into a plain-language message:
 *
 *   ?code=…                 PKCE (what @supabase/ssr uses) → exchange it
 *   ?token_hash=…&type=…    a template pointing straight here → verify it
 *   ?message=…              Supabase accepted one of TWO links ("secure email
 *                           change"): the other address must confirm too
 *   ?error_description=…    expired or already-used link
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Only ever a path on this site — never an absolute URL from the query.
  const nextParam = params.get("next") ?? "/profil";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/profil";

  const done = (flag: string) => {
    const target = new URL(next, url.origin);
    target.searchParams.set("auth", flag);
    return NextResponse.redirect(target);
  };

  if (params.get("error") || params.get("error_description")) {
    return done("link_invalid");
  }

  const supabase = createClient();

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return done("link_invalid");
  }

  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return done("link_invalid");
  }

  if (params.get("message")) {
    return done("email_partial");
  }

  await finishPairing(supabase);

  return done("email_confirmed");
}

/**
 * A secretary's sign-up confirmation is also where her account joins the
 * cabinet. The pairing key rode along in her user metadata because signUp had
 * no session to claim with (see signup-form.tsx); now there is one. Without
 * this, confirming landed her on "Accès non autorisé" until she happened to
 * sign in again through the login form, which does the same thing.
 */
async function finishPairing(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata as
    | { pairing_key?: string | null; full_name?: string | null }
    | undefined;
  if (!meta?.pairing_key) return;

  const { error } = await supabase.rpc("claim_staff_with_key", {
    p_key: meta.pairing_key,
    p_full_name: meta.full_name ?? "",
  });
  const raised = error ? `${error.message} ${error.details ?? ""}` : "";

  // Attached (now or earlier): spend the key so this runs once.
  if (!error || raised.includes("ALREADY_STAFF")) {
    await supabase.auth.updateUser({ data: { pairing_key: null } });
  }
  // Any other failure is left for the login form, which explains it.
}
