import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { clientIp, normalisePhone } from "@/lib/request-intake";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

/**
 * "How was your appointment?"
 *
 * Everything that decides whether this rating is allowed happens inside
 * `submit_provider_rating` in the database, not here: anon cannot read
 * appointment_requests, so "did this phone actually attend?" is not a question
 * the browser — or this route — is permitted to answer for itself.
 *
 * This layer only shapes input, keeps the anti-robot check, and translates the
 * function's verdict into something a patient can read.
 *
 * One deliberate weakness, documented in the migration too: whoever already
 * knows a phone number can learn from the verdict whether it attended a given
 * practice. Turnstile plus the per-IP ceiling below is what keeps that from
 * being usable at scale; closing it entirely would mean demanding a detail
 * only the patient could know, which costs more real ratings than it saves.
 */

/** 1–5, or null when the criterion was skipped. Anything else is refused. */
function optionalStar(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return "invalid";
  return n;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    provider_slug?: string;
    phone?: string;
    stars?: unknown;
    punctuality?: unknown;
    welcome?: unknown;
    explanation?: unknown;
    turnstile_token?: string;
    company?: string; // honeypot
  };

  // Same contract as the other public forms: a filled honeypot gets a 200 so
  // the bot books the win and does not come back wearing a different shape.
  if (body.company) return NextResponse.json({ ok: true });

  const slug = String(body.provider_slug ?? "").trim();
  if (!slug) return bad("Établissement manquant.");

  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return bad("Merci de donner une note de 1 à 5.");
  }

  const detail = {
    punctuality: optionalStar(body.punctuality),
    welcome: optionalStar(body.welcome),
    explanation: optionalStar(body.explanation),
  };
  if (Object.values(detail).includes("invalid")) {
    return bad("Note de détail invalide.");
  }

  const phone = normalisePhone(String(body.phone ?? ""));
  if (phone.replace(/\D/g, "").length < 8) {
    return bad("Numéro de téléphone invalide.");
  }

  const turnstile = await verifyTurnstile(body.turnstile_token, clientIp(req));
  if (turnstile === "failed") return bad("Vérification anti-robot échouée.");

  const supabase = createClient();

  const { data, error } = await supabase.rpc("submit_provider_rating", {
    p_provider_slug: slug,
    p_phone: phone,
    p_stars: stars,
    p_punctuality: detail.punctuality,
    p_welcome: detail.welcome,
    p_explanation: detail.explanation,
  });

  if (error) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre note." },
      { status: 500 },
    );
  }

  const verdict = (data ?? {}) as { ok?: boolean; error?: string };
  if (verdict.ok) return NextResponse.json({ ok: true });

  // Deliberately vague on WHY there is no match. Saying "that number has no
  // appointment here" to anyone who asks turns this endpoint into a lookup on
  // other people's phone numbers.
  switch (verdict.error) {
    case "no_visit":
      return bad(
        "Nous ne trouvons pas de rendez-vous passé pour ce numéro dans cet " +
          "établissement. Seuls les patients qui s'y sont rendus peuvent noter.",
        403,
      );
    case "not_rateable":
      return bad(
        "Cet établissement ne prend pas encore ses rendez-vous sur DoctorY, " +
          "il ne peut donc pas être noté.",
        409,
      );
    case "provider":
      return bad("Établissement introuvable.", 404);
    default:
      return bad("Note invalide.");
  }
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
