import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/request-intake";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const REASONS = ["horaires", "adresse", "telephone", "ferme", "garde", "autre"];

/**
 * "This listing is wrong."
 *
 * An annuaire seeded from bought data is wrong somewhere on day one, and the
 * only people who find out are the ones standing in front of a closed door.
 * This is the cheapest possible way for them to say so: no account, no
 * explanation required beyond a category.
 *
 * Writes with the anon client so RLS applies exactly as it does in the
 * browser, and never asks for the row back — anon holds `insert` on this table
 * and nothing else, so a `select()` here would fail the whole request.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    provider_slug?: string;
    reason?: string;
    detail?: string;
    contact?: string;
    turnstile_token?: string;
    company?: string; // honeypot
  };

  // A hidden field no human ever fills. Answer 200 so the bot believes it
  // worked and does not come back with a different shape.
  if (body.company) return NextResponse.json({ ok: true });

  const reason = String(body.reason ?? "");
  if (!REASONS.includes(reason)) return bad("Motif de signalement invalide.");

  const detail = String(body.detail ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  if (detail.length > 1000) return bad("Message trop long.");
  if (contact.length > 160) return bad("Contact trop long.");

  const turnstile = await verifyTurnstile(body.turnstile_token, clientIp(req));
  if (turnstile === "failed") return bad("Vérification anti-robot échouée.");

  const supabase = createClient();

  // The form sends a slug because that is what the URL carries; the row needs
  // an id. Resolving it here also means a report can never be filed against an
  // establishment that is not published.
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("slug", String(body.provider_slug ?? ""))
    .eq("is_published", true)
    .maybeSingle();

  if (!provider) return bad("Établissement introuvable.", 404);

  const { error } = await supabase.from("provider_reports").insert({
    provider_id: (provider as { id: string }).id,
    reason,
    detail,
    contact,
  });

  if (error) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer le signalement." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
