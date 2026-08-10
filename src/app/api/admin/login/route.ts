import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, constantTimeEqual } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h — short enough that a stolen cookie ages out on its own

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  const expectedUsername = process.env.ADMIN_USERNAME || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  const sessionToken = process.env.ADMIN_SESSION_TOKEN || "";

  if (!expectedUsername || !expectedPassword || !sessionToken) {
    return NextResponse.json(
      { error: "Le tableau de bord admin n'est pas configuré." },
      { status: 503 },
    );
  }

  const ok =
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(password, expectedPassword);

  if (!ok) {
    return NextResponse.json(
      { error: "Identifiant ou mot de passe incorrect." },
      { status: 401 },
    );
  }

  cookies().set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ success: true });
}
