import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { findPatientByDossier } from "@/lib/front-desk";
import { getDoctorBySlug } from "@/lib/doctors";
import { clientIp, hashIp, normalisePhone } from "@/lib/request-intake";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

/**
 * Public appointment-request intake. The only route in this app reachable
 * without a session, so it is the one hostile input surface.
 *
 * Nothing here touches the doctor's database: a request is an inbox item that
 * the secretary reviews. A patient record is created only on approval.
 *
 * Order matters — cheap rejections first, Cloudflare round-trip next, database
 * last, so a flood costs us as little as possible.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    last_name?: string;
    first_name?: string;
    phone?: string;
    gender?: string;
    age?: number | string | null;
    reason?: string;
    preferred_date?: string;
    preferred_at?: string;
    preferred_period?: string;
    doctor_slug?: string;
    is_existing_patient?: boolean;
    numero_dossier?: string;
    turnstile_token?: string;
    company?: string; // honeypot
  };

  // 1. Honeypot — a hidden field no human ever fills. Answer 200 so the bot
  //    believes it succeeded and does not retry with a different shape.
  if (body.company) return NextResponse.json({ ok: true });

  // 2. Shape and length checks.
  let last_name = (body.last_name ?? "").trim();
  let first_name = (body.first_name ?? "").trim();
  const phoneRaw = (body.phone ?? "").trim();
  const phoneDigits = normalisePhone(phoneRaw);
  const reason = (body.reason ?? "").trim();

  if (last_name.length > 80) return bad("Nom trop long.");
  if (first_name.length > 80) return bad("Prénom trop long.");
  if (phoneDigits.length < 6 || phoneDigits.length > 20) {
    return bad("Numéro de téléphone invalide.");
  }
  if (reason.length > 500) return bad("Motif trop long.");

  let gender = body.gender === "M" || body.gender === "F" ? body.gender : "";
  const period =
    body.preferred_period === "matin" || body.preferred_period === "apres_midi"
      ? body.preferred_period
      : "";

  let ageNum =
    body.age === "" || body.age === null || body.age === undefined
      ? null
      : Number(body.age);
  if (ageNum !== null && (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130)) {
    return bad("Âge invalide.");
  }

  // Either an exact slot picked off the availability grid, or a loose day.
  // The exact slot wins; both are only a *request*, never a reservation.
  let preferredAt: string | null = null;
  if (body.preferred_at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.preferred_at)) {
    const d = new Date(`${body.preferred_at}:00`);
    if (Number.isNaN(d.getTime())) return bad("Créneau souhaité invalide.");
    if (d.getTime() < Date.now()) return bad("Ce créneau est déjà passé.");
    preferredAt = d.toISOString();
  } else if (body.preferred_date) {
    const d = new Date(`${body.preferred_date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return bad("Date souhaitée invalide.");
    // A request for a day already gone is a mistake, not a booking.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return bad("La date souhaitée est déjà passée.");
    preferredAt = d.toISOString();
  }

  // 2b. Returning patient: confirm dossier + phone against doctor.db and take
  //     their identity from there. This is why the form can stop asking for it
  //     — and why the browser is never sent the record.
  const dossier = (body.numero_dossier ?? "").trim().slice(0, 40);
  const isExisting = body.is_existing_patient === true;
  let dossierVerified = false;

  if (isExisting && dossier) {
    try {
      const doctor = await getDoctorBySlug(body.doctor_slug ?? "");
      const patient = doctor?.is_published
        ? await findPatientByDossier(doctor.id, dossier, phoneDigits)
        : null;
      if (patient) {
        dossierVerified = true;
        last_name = patient.last_name || last_name;
        first_name = patient.first_name || first_name;
        gender = (patient.gender === "M" || patient.gender === "F"
          ? patient.gender
          : gender) as typeof gender;
        ageNum = patient.age ?? ageNum;
      }
    } catch {
      // Lookup failed: fall through and use whatever the visitor typed. The
      // secretary resolves it on review.
    }
  }

  // Either the dossier gave us a name, or the visitor must have supplied one.
  if (!last_name) {
    return bad(
      isExisting
        ? "Numéro de dossier ou téléphone incorrect. Vérifiez-les, ou choisissez « Nouveau patient »."
        : "Le nom est obligatoire.",
    );
  }

  // 3. Bot check.
  const ip = clientIp(req);
  const turnstile = await verifyTurnstile(body.turnstile_token, ip);

  if (turnstile === "disabled") {
    // Loud on every submission, and meant to be: this is the one state where
    // the form is open to scripts, and it should be uncomfortable to leave on.
    // The database caps (3/IP, 2/phone per 24h) are all that remains.
    console.warn(
      "[public/requests] accepted with NO bot verification — NEXT_PUBLIC_TURNSTILE_ENABLED=false.",
    );
  }

  if (turnstile === "not_configured") {
    // Our fault, not the visitor's — do not accuse them of being a robot.
    console.error(
      "[public/requests] Turnstile is not usable (missing/invalid TURNSTILE_SECRET_KEY, or Cloudflare unreachable). Requests are being refused.",
    );
    return bad(
      "Le formulaire est momentanément indisponible. Réessayez dans quelques minutes.",
      503,
      "TURNSTILE_UNAVAILABLE",
    );
  }
  if (turnstile === "failed") {
    return bad("Vérification anti-robot échouée. Rechargez la page.", 403);
  }

  // 4. Validate, rate-limit and insert in one database call.
  //
  //    submit_appointment_request is SECURITY DEFINER: it enforces the 24h caps
  //    itself and writes the row. That is why this route uses the ANON key —
  //    no service-role secret is needed, and `anon` still cannot read the
  //    table or set any review/sync column.
  const supabase = createClient();

  const { error } = await supabase.rpc("submit_appointment_request", {
    p_last_name: last_name,
    p_first_name: first_name,
    p_phone: phoneDigits,
    p_gender: gender,
    p_age: ageNum,
    p_reason: reason,
    p_preferred_at: preferredAt,
    p_preferred_period: period,
    p_doctor_slug: body.doctor_slug ?? "",
    p_ip_hash: hashIp(ip),
    p_is_existing_patient: isExisting,
    p_numero_dossier: dossier,
    p_dossier_verified: dossierVerified,
  });

  if (error) {
    const raised = `${error.message} ${error.details ?? ""}`;

    if (raised.includes("RATE_LIMITED")) return bad(TOO_MANY, 429);
    if (raised.includes("INVALID_PHONE")) return bad("Numéro de téléphone invalide.");
    if (raised.includes("INVALID_NAME")) return bad("Le nom est obligatoire.");
    if (raised.includes("INVALID_AGE")) return bad("Âge invalide.");
    if (raised.includes("INVALID_DOSSIER")) {
      return bad("Entrez votre numéro de dossier.");
    }

    // Most likely the migration has not been run yet — say so in the log, stay
    // vague to the visitor.
    console.error("[public/requests] insert failed:", error.message);
    return bad("Envoi impossible pour le moment. Réessayez plus tard.", 500);
  }

  return NextResponse.json({ ok: true });
}

const TOO_MANY =
  "Vous avez déjà envoyé plusieurs demandes. Le secrétariat vous rappellera — merci de patienter.";

// `code` is for whoever is debugging a deployment: the visitor-facing message
// stays vague, the network tab says exactly which piece is missing.
function bad(error: string, status = 400, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}
