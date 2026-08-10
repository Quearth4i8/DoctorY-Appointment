import { NextResponse } from "next/server";

import { createLicense, listLicenses } from "@/lib/admin/licenses";
import { isAdminRequest } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const licenses = await listLicenses();
    return NextResponse.json(licenses);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const maxActivations = Number(body.max_activations ?? 2);
  const expiresAt = body.expires_at ? String(body.expires_at) : null;

  if (!label) {
    return NextResponse.json({ error: "Un libellé est requis." }, { status: 400 });
  }
  if (!Number.isFinite(maxActivations) || maxActivations < 1) {
    return NextResponse.json(
      { error: "Le nombre de machines doit être au moins 1." },
      { status: 400 },
    );
  }

  try {
    const key = await createLicense({
      label,
      max_activations: maxActivations,
      expires_at: expiresAt,
    });
    return NextResponse.json({ key });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
