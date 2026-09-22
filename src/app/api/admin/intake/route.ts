import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin/require-admin";
import {
  approveClaim,
  intakeCounts,
  listClaims,
  listFeedback,
  listReports,
  resolveClaim,
  resolveFeedback,
  resolveReport,
  type ClaimStatus,
} from "@/lib/admin/intake";

export const dynamic = "force-dynamic";

const QUEUES = ["claims", "reports", "feedback"] as const;
type Queue = (typeof QUEUES)[number];

/**
 * One endpoint for the three intake queues.
 *
 * They share a shape — list by status, then resolve one row — so three near
 * identical route files would have been three places to keep the admin gate
 * right. `/api/admin` is already blocked in middleware for anyone without the
 * admin cookie; `isAdminRequest()` here is the second lock, matching how the
 * other admin routes are written.
 */
export async function GET(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const queue = params.get("queue") as Queue | null;
  // "toutes" and an absent value both mean no filter.
  const statusParam = params.get("status");
  const status = !statusParam || statusParam === "toutes" ? null : statusParam;

  try {
    if (queue === "claims") return NextResponse.json(await listClaims(status));
    if (queue === "reports") return NextResponse.json(await listReports(status));
    if (queue === "feedback") return NextResponse.json(await listFeedback(status));
    return NextResponse.json(await intakeCounts());
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

  const body = (await req.json().catch(() => ({}))) as {
    queue?: string;
    id?: string;
    action?: string;
    status?: string;
    resolution?: string;
  };

  const { queue, id, action } = body;
  if (!id) return NextResponse.json({ error: "Id manquant." }, { status: 400 });

  try {
    if (queue === "claims") {
      if (action === "approve") {
        return NextResponse.json(await approveClaim(id));
      }
      await resolveClaim(
        id,
        (body.status ?? "refuse") as ClaimStatus,
        body.resolution ?? "",
      );
      return NextResponse.json({ ok: true });
    }

    if (queue === "reports") {
      await resolveReport(id, body.status ?? "traite");
      return NextResponse.json({ ok: true });
    }

    if (queue === "feedback") {
      await resolveFeedback(id, body.status ?? "lu");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "File inconnue." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 500 },
    );
  }
}
