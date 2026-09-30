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

  return done("email_confirmed");
}
