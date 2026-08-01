import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Routes reachable without a session.
 *
 * Everything else — the scheduler, the review inbox and every /api proxy route
 * into the doctor's database — requires a signed-in staff user. The app is
 * reachable from the internet now, so this list is the perimeter: adding a path
 * here exposes it to the public.
 */
const PUBLIC_PREFIXES = [
  "/login", // secretary sign-in
  "/demande", // public "request an appointment" form
  "/medecins", // public doctor profiles
  "/api/public", // endpoints backing the public pages
  "/api/sync", // doctor's desktop app, authenticated by DESKTOP_SYNC_TOKEN
  "/auth", // sign-out and auth callbacks
];

/** Staff routes. Everything not public lands here; listed for readability. */
export const STAFF_HOME = "/agenda";

/**
 * Matches whole path segments only — NEVER a bare startsWith.
 *
 * "/demande" is the public form; "/demandes" is the secretary's review inbox,
 * one letter apart. A plain prefix test would make the inbox, and every
 * patient's name and phone number in it, world-readable.
 *
 * "/" is handled separately for the same reason: as a prefix it would match
 * every path in the app.
 */
function isPublic(pathname: string): boolean {
  if (pathname === "/") return true; // public landing page
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors to /login.
 *
 * The response object must be the one Supabase wrote its cookies onto, so we
 * never build a fresh NextResponse after calling getUser() — we only ever copy
 * the refreshed cookies onto a redirect.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Revalidates the token with Supabase; do not replace with getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    // API calls get a 401 rather than an HTML redirect they cannot follow.
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Session expirée. Reconnectez-vous.", code: "UNAUTHENTICATED" },
        { status: 401 },
      );
      // Copy only the refreshed cookies — never `response.headers`, which
      // carries x-middleware-next and would let the request through anyway.
      for (const cookie of response.cookies.getAll()) {
        unauthorized.cookies.set(cookie);
      }
      return unauthorized;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // Already signed in and looking at the login page → send them to the agenda.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = STAFF_HOME;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
