import { NextResponse } from "next/server";

import { findPatientByDossier } from "@/lib/doctor-api";
import { clientIp, hashIp } from "@/lib/request-intake";

export const dynamic = "force-dynamic";

/**
 * Confirms that a numéro de dossier and a phone number belong to the same
 * patient, so a returning visitor does not have to retype what the doctor
 * already has.
 *
 * SECURITY, and the reason this returns a bare boolean:
 *
 *  - File numbers are sequential ("83/2026"), so they are guessable. Echoing
 *    back a name, phone or age would turn this into a patient-list dump.
 *  - Requiring the phone as a second factor means an attacker must already
 *    know the phone for a given dossier, which is the thing they would be
 *    trying to learn.
 *  - It is still a yes/no oracle, so it is rate-limited per IP.
 *
 * The response is `{ verified: boolean }`. Nothing else. Ever.
 */

// Per-IP attempts, in-process. Enough to blunt scripted guessing; a serious
// deployment behind several instances should move this to the database.
const ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 15;

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = ATTEMPTS.get(key);

  if (!entry || entry.resetAt < now) {
    ATTEMPTS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    numero_dossier?: string;
    phone?: string;
  };

  const dossier = (body.numero_dossier ?? "").trim();
  const phone = (body.phone ?? "").replace(/\D/g, "");

  if (!dossier || phone.length < 6) {
    return NextResponse.json({ verified: false });
  }

  const key = hashIp(clientIp(req)) ?? "unknown";
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { verified: false, error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 },
    );
  }

  try {
    const patient = await findPatientByDossier(dossier, phone);
    return NextResponse.json({ verified: patient !== null });
  } catch {
    // Doctor's machine unreachable — say "not verified" rather than leaking
    // that the lookup itself failed; the visitor can still fill the form.
    return NextResponse.json({ verified: false });
  }
}
