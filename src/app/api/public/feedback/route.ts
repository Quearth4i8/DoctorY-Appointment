import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/request-intake";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const CATEGORIES = ["suggestion", "probleme", "compliment", "autre"];

/**
 * Feedback about the site.
 *
 * Writes with the anon client so RLS applies exactly as it does in the
 * browser, and never asks for the row back — anon holds `insert` here and
 * nothing else, so a `select()` would fail the whole request.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    rating?: number | string | null;
    category?: string;
    message?: string;
    contact?: string;
    page_path?: string;
    turnstile_token?: string;
    company?: string; // honeypot
  };

  // A hidden field no human ever fills. Answer 200 so the bot believes it
  // worked and does not come back with a different shape.
  if (body.company) return NextResponse.json({ ok: true });

  const message = String(body.message ?? "").trim();
  if (message.length < 3) return bad("Écrivez quelques mots.");
  if (message.length > 2000) return bad("Message trop long.");

  const category = String(body.category ?? "suggestion");
  if (!CATEGORIES.includes(category)) return bad("Catégorie invalide.");

  const contact = String(body.contact ?? "").trim();
  if (contact.length > 160) return bad("Contact trop long.");

  // Absent is a valid answer; a number outside 1–5 is not.
  let rating: number | null = null;
  if (body.rating !== null && body.rating !== undefined && body.rating !== "") {
    const n = Number(body.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) return bad("Note invalide.");
    rating = n;
  }

  /*
   * The path, stripped of everything after it.
   *
   * The client sends `location.pathname`, but trusting that would let a caller
   * post whatever they liked — including a query string carrying someone's
   * search. Cutting it here means the column can only ever hold a path.
   */
  const page_path = String(body.page_path ?? "")
    .split(/[?#]/)[0]
    .slice(0, 120);

  const turnstile = await verifyTurnstile(body.turnstile_token, clientIp(req));
  if (turnstile === "failed") return bad("Vérification anti-robot échouée.");

  const { error } = await createClient().from("site_feedback").insert({
    rating,
    category,
    message,
    contact,
    page_path: page_path.startsWith("/") ? page_path : "",
  });

  if (error) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre avis." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
