export type LatLng = { lat: number; lng: number };

/**
 * Pulls coordinates out of whatever the secretary pasted.
 *
 * Accepts a plain "36.8065, 10.1815" as well as the URL shapes Google Maps
 * produces, because "copy the link" is the only step a non-technical user can
 * be expected to perform reliably.
 *
 * Short links (maps.app.goo.gl) carry no coordinates and cannot be resolved
 * without following the redirect — the UI tells the user to open them first.
 */
export function parseLatLng(input: string): LatLng | null {
  const s = (input ?? "").trim();
  if (!s) return null;

  const patterns = [
    /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/, // "36.8, 10.18"
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // .../@lat,lng,17z
    /[?&](?:q|query|ll|daddr)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // ?q=lat,lng
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/, // place data blob
  ];

  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { lat, lng };
      }
    }
  }
  return null;
}

/** OpenStreetMap embed — no API key, no billing account, no tracking. */
export function osmEmbedUrl({ lat, lng }: LatLng, spread = 0.004): string {
  const bbox = [lng - spread, lat - spread, lng + spread, lat + spread]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/** Opens turn-by-turn directions in whatever maps app the visitor has. */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
