import { NextResponse } from "next/server";

import { deleteLicense, updateLicense } from "@/lib/admin/licenses";
import { isAdminRequest } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const maxActivations = Number(body.max_activations);
  const expiresAt = body.expires_at ? String(body.expires_at) : null;
  const revoked = Boolean(body.revoked);

  if (!Number.isFinite(maxActivations) || maxActivations < 1) {
    return NextResponse.json(
      { error: "Le nombre de machines doit être au moins 1." },
      { status: 400 },
    );
  }

  try {
    await updateLicense({
      key: params.key,
      max_activations: maxActivations,
      expires_at: expiresAt,
      revoked,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { key: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await deleteLicense(params.key);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
