import { NextResponse } from "next/server";

import { deleteUser } from "@/lib/admin/accounts";
import { isAdminRequest } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await deleteUser(params.userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
