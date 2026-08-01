import { NextResponse } from "next/server";

import { createClient, getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Refuse a request (or re-open one). Refusing writes nothing to doctor.db —
 * the request simply stops being pending.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    staff_notes?: string;
  };

  if (body.status !== "refuse" && body.status !== "en_attente") {
    // Accepting goes through ./accept, which also has to touch doctor.db.
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("appointment_requests")
    .update({
      status: body.status,
      staff_notes: body.staff_notes?.slice(0, 500) ?? "",
      reviewed_by: body.status === "refuse" ? staff.user_id : null,
      reviewed_at: body.status === "refuse" ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Mise à jour impossible." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
