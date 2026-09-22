import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { clientIp, normalisePhone } from "@/lib/request-intake";
import { verifyTurnstile } from "@/lib/turnstile";
import { PROVIDER_KIND_LABELS, type ProviderKind } from "@/types";

export const dynamic = "force-dynamic";

const KINDS = new Set(Object.keys(PROVIDER_KIND_LABELS));

/**
 * Intake for the two ways onto the platform.
 *
 *   inscription   — an establishment that is not listed yet.
 *   revendication — an establishment that is listed and whose owner wants it.
 *
 * Neither does anything by itself. No provider is created, no membership is
 * granted; an operator reads the queue and rings the number. That is
 * deliberate for the second one especially: most listings will arrive from a
 * bought dataset, so a self-service claim button would hand an establishment
 * to whoever filled the form first.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    intent?: string;
    provider_slug?: string;
    kind?: string;
    establishment?: string;
    city?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    professional_id?: string;
    message?: string;
    turnstile_token?: string;
    company?: string; // honeypot
  };

  if (body.company) return NextResponse.json({ ok: true });

  const intent = String(body.intent ?? "");
  if (intent !== "inscription" && intent !== "revendication") {
    return bad("Type de demande invalide.");
  }

  const contact_name = String(body.contact_name ?? "").trim();
  const phoneDigits = normalisePhone(String(body.phone ?? ""));
  if (contact_name.length < 2 || contact_name.length > 120) {
    return bad("Nom du contact invalide.");
  }
  if (phoneDigits.length < 6 || phoneDigits.length > 20) {
    return bad("Numéro de téléphone invalide.");
  }

  const establishment = String(body.establishment ?? "").trim();
  const city = String(body.city ?? "").trim();
  const email = String(body.email ?? "").trim();
  const professional_id = String(body.professional_id ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (establishment.length > 200) return bad("Nom d'établissement trop long.");
  if (city.length > 120) return bad("Ville trop longue.");
  if (email.length > 160) return bad("Adresse e-mail trop longue.");
  if (professional_id.length > 80) return bad("Identifiant trop long.");
  if (message.length > 1000) return bad("Message trop long.");

  const turnstile = await verifyTurnstile(body.turnstile_token, clientIp(req));
  if (turnstile === "failed") return bad("Vérification anti-robot échouée.");

  const supabase = createClient();

  // The table's own check constraint enforces this pairing too. Doing it here
  // as well turns a constraint violation — which reaches the visitor as an
  // opaque 500 — into a sentence that tells them what to fix.
  let provider_id: string | null = null;
  let kind: ProviderKind | null = null;

  if (intent === "revendication") {
    const { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("slug", String(body.provider_slug ?? ""))
      .eq("is_published", true)
      .maybeSingle();
    if (!provider) return bad("Établissement introuvable.", 404);
    provider_id = (provider as { id: string }).id;
  } else {
    const k = String(body.kind ?? "");
    if (!KINDS.has(k)) return bad("Type d'établissement invalide.");
    kind = k as ProviderKind;
    if (establishment.length < 2) return bad("Indiquez le nom de l'établissement.");
  }

  const { error } = await supabase.from("provider_claims").insert({
    intent,
    provider_id,
    kind,
    establishment,
    city,
    contact_name,
    phone: phoneDigits,
    email,
    professional_id,
    message,
  });

  if (error) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer la demande." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
