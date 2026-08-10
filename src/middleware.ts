import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, sessionTokenMatches } from "@/lib/admin/session";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * The admin dashboard has nothing to do with staff/Supabase Auth — a separate
 * password gate for a single operator, not a doctor's account — so it is
 * branched off before updateSession() ever runs, rather than added to that
 * function's public-prefix list.
 */
function isAdminSessionValid(request: NextRequest): boolean {
  return sessionTokenMatches(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();

    if (!isAdminSessionValid(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login") return NextResponse.next();

    if (!isAdminSessionValid(request)) {
      return NextResponse.json(
        { error: "Session administrateur expirée." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except Next.js internals and static assets. Keeping /api in
     * scope is deliberate: those routes reach the doctor's database.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
