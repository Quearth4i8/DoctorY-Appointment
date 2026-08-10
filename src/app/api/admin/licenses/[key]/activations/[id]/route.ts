import { NextResponse } from "next/server";

import { releaseActivation } from "@/lib/admin/licenses";
import { isAdminRequest } from "@/lib/admin/require-admin";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await releaseActivation(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
