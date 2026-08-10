import { NextResponse } from "next/server";

import { listActivations } from "@/lib/admin/licenses";
import { isAdminRequest } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

/** Every activation across every key — feeds the dashboard's growth chart. */
export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const activations = await listActivations();
    return NextResponse.json(activations);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
