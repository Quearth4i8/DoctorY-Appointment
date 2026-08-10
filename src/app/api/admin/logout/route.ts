import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/admin/session";

export async function POST() {
  cookies().delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
