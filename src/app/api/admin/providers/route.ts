import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin/require-admin";
import {
  getProvider,
  listProviders,
  publishProvider,
  saveProvider,
} from "@/lib/admin/intake";

export const dynamic = "force-dynamic";

function guard() {
  return isAdminRequest()
    ? null
    : NextResponse.json({ error: "Non autorisé." }, { status: 401 });
}

function fail(e: unknown) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Erreur inconnue." },
    { status: 500 },
  );
}

export async function GET(req: Request) {
  const denied = guard();
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const id = params.get("id");

  try {
    if (id) return NextResponse.json(await getProvider(id));
    return NextResponse.json(
      await listProviders(params.get("q") ?? "", params.get("drafts") === "1"),
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const denied = guard();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: string;
    published?: boolean;
    data?: Record<string, unknown>;
  };

  if (!body.id) {
    return NextResponse.json({ error: "Id manquant." }, { status: 400 });
  }

  try {
    if (body.action === "publish") {
      await publishProvider(body.id, body.published === true);
      return NextResponse.json({ ok: true });
    }
    await saveProvider(body.id, body.data ?? {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    // A publish refusal is the operator's to fix, not a server fault — 422 so
    // the client can show the sentence rather than a generic failure.
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("Ajoutez")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return fail(e);
  }
}
