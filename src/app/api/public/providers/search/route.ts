import { NextResponse } from "next/server";

import { searchProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

/**
 * A few published establishments matching a name, for pickers such as the
 * "Signaler une erreur" page. Public fields only — exactly what the annuaire
 * already shows.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json([]);

  try {
    const rows = await searchProviders({ q, limit: 8, sort: "name" });
    return NextResponse.json(
      rows.map((p) => ({ slug: p.slug, name: p.name, city: p.city, kind: p.kind })),
    );
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
