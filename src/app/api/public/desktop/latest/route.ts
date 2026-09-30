import { NextResponse } from "next/server";

import { LATEST_RELEASE, downloadUrl } from "@/lib/desktop-releases";

/**
 * The newest desktop version, for an "une mise à jour est disponible" check
 * inside the app. Public and cacheable: it says nothing a visitor to
 * /telecharger could not read.
 */
export function GET() {
  return NextResponse.json(
    {
      version: LATEST_RELEASE.version,
      date: LATEST_RELEASE.date,
      title: LATEST_RELEASE.title,
      notes: LATEST_RELEASE.notes,
      url: downloadUrl(LATEST_RELEASE),
      page: "/telecharger",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
