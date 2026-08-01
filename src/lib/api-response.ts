import { NextResponse } from "next/server";

import { DoctorApiError } from "@/lib/doctor-api";
import { getStaff } from "@/lib/supabase/server";

/**
 * Same as `handle`, but first requires the caller to be a signed-in member of
 * the `staff` table.
 *
 * The middleware only proves *someone* is signed in. Anyone with a Supabase
 * account in this project would clear that bar, so every route that reaches the
 * doctor's database checks membership here as well.
 */
export async function handleStaff<T>(fn: () => Promise<T>): Promise<NextResponse> {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Accès non autorisé.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }
  return handle(fn);
}

/** Runs a proxy handler and maps DoctorApiError into a clean JSON response. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof DoctorApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code, detail: err.detail },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 },
    );
  }
}
