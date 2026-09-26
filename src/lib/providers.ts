import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BookingMode,
  DutyShift,
  OpeningRange,
  Practitioner,
  Provider,
  ProviderKind,
  ProviderPlan,
  ProviderSearchParams,
  ProviderSource,
  ProviderSummary,
  Service,
  Specialty,
} from "@/types";

/**
 * Reads the annuaire with the anon key, so Row Level Security decides what is
 * visible: a visitor sees published establishments, a member also sees their
 * own drafts. There is no privileged path here on purpose.
 */

const SUMMARY_FIELDS =
  "id, kind, slug, name, photo_url, address, city, latitude, longitude, phone, " +
  "booking_mode, accepts_cnam, third_party_payer, wheelchair_access, " +
  "accepts_new_patients, open_24_7, has_emergency, plan, plan_expires_at, verified_at, " +
  "rating_avg, rating_count";

const FULL_FIELDS =
  SUMMARY_FIELDS +
  ", legal_name, bio, logo_url, postcode, governorate, phone_alt, email, " +
  "website, languages, source, claimed_at, is_published, legacy_doctor_id";

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string =>
  v === null || v === undefined ? fallback : String(v);
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/**
 * Whether paid placement is live at this instant.
 *
 * Derived on read rather than stored, so a subscription that lapsed overnight
 * stops buying position the moment it lapses — no nightly job, and no window
 * where the annuaire is selling something that has expired.
 */
function sponsoredNow(row: Row, at: Date): boolean {
  if (row.plan !== "sponsorise") return false;
  const until = row.plan_expires_at ? new Date(String(row.plan_expires_at)) : null;
  return until !== null && until > at;
}

function toSummary(row: Row, at: Date): ProviderSummary {
  return {
    id: str(row.id),
    kind: str(row.kind) as ProviderKind,
    slug: str(row.slug),
    name: str(row.name),
    photo_url: str(row.photo_url),
    address: str(row.address),
    city: str(row.city),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    phone: str(row.phone),
    booking_mode: str(row.booking_mode, "demande") as BookingMode,
    accepts_cnam: bool(row.accepts_cnam),
    third_party_payer: bool(row.third_party_payer),
    wheelchair_access: bool(row.wheelchair_access),
    accepts_new_patients: bool(row.accepts_new_patients),
    open_24_7: bool(row.open_24_7),
    has_emergency: bool(row.has_emergency),
    is_sponsored: sponsoredNow(row, at),
    verified: row.verified_at !== null && row.verified_at !== undefined,
    specialties: [],
    // `num` keeps null as null: an unrated establishment must not arrive as 0.
    rating_avg: num(row.rating_avg),
    rating_count: Number(row.rating_count ?? 0),
    distance_km: null,
    from_millimes: null,
    on_duty_until: null,
  };
}

/**
 * Great-circle distance in kilometres — the same formula as the SQL
 * `distance_km`, so a result sorted in the database and one sorted here agree.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * A latitude/longitude box that contains every point within `radiusKm`.
 *
 * This is a prefilter, not the answer: it over-selects the corners of the box,
 * which the exact distance then drops. Its job is to let the index do the
 * first cut so the database is not handing back every establishment in the
 * country for the sort to whittle down.
 */
function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  // Degrees of longitude shrink towards the poles. The clamp keeps a radius
  // near a pole from producing an infinite span; at Tunisian latitudes it
  // never binds, but a divide-by-zero here would be a very silent bug.
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const dLng = radiusKm / (111.32 * cos);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/**
 * The establishments open at this instant.
 *
 * Three things count as open, and missing any one of them makes the filter
 * lie: a range covering now on today's weekday, a place flagged `open_24_7`,
 * and — the one that is easy to forget — a range that started yesterday and
 * has not closed yet. Opening hours are stored as wall-clock times, so a
 * pharmacy open 20:00–02:00 is two rows, and at 01:00 the row that covers you
 * belongs to yesterday.
 */
async function openNowProviderIds(at: Date): Promise<string[]> {
  const supabase = createClient();

  // 1 = Monday … 7 = Sunday, matching the stored convention.
  const today = ((at.getDay() + 6) % 7) + 1;
  const yesterday = ((today + 5) % 7) + 1;
  const hhmm = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

  const [sameDay, overnight, always] = await Promise.all([
    supabase
      .from("opening_hours")
      .select("provider_id")
      .eq("weekday", today)
      .lte("opens_at", hhmm)
      .gt("closes_at", hhmm),
    // Yesterday's ranges that run past midnight. `closes_at > opens_at` is a
    // table constraint, so a range can only cross midnight by being recorded
    // as two rows — this picks up the tail of that pair.
    supabase
      .from("opening_hours")
      .select("provider_id")
      .eq("weekday", yesterday)
      .lte("opens_at", "00:00")
      .gt("closes_at", hhmm),
    supabase.from("providers").select("id").eq("open_24_7", true).eq("is_published", true),
  ]);

  const ids = new Set<string>();
  for (const r of ((sameDay.data ?? []) as unknown as Row[])) ids.add(str(r.provider_id));
  for (const r of ((overnight.data ?? []) as unknown as Row[])) ids.add(str(r.provider_id));
  for (const r of ((always.data ?? []) as unknown as Row[])) ids.add(str(r.id));
  return [...ids];
}

/**
 * Search the annuaire.
 *
 * Ordering is: sponsored band first, then whatever the visitor asked to sort
 * by. Paid placement moves an establishment up inside the results it already
 * matched — it never inserts one that does not match, and the caller is
 * expected to label the band (`is_sponsored`) rather than hide it.
 */
export async function searchProviders(
  params: ProviderSearchParams = {},
): Promise<ProviderSummary[]> {
  const supabase = createClient();
  const at = new Date();
  const limit = params.limit ?? 40;

  let query = supabase
    .from("providers")
    .select(SUMMARY_FIELDS)
    .eq("is_published", true);

  if (params.kinds?.length) query = query.in("kind", params.kinds);
  if (params.city) query = query.ilike("city", `%${params.city}%`);
  if (params.cnam) query = query.eq("accepts_cnam", true);
  if (params.thirdParty) query = query.eq("third_party_payer", true);
  if (params.wheelchair) query = query.eq("wheelchair_access", true);
  if (params.acceptingNew) query = query.eq("accepts_new_patients", true);
  if (params.languages?.length) query = query.overlaps("languages", params.languages);

  // `search_text` is a stored generated column with a trigram GIN index, so
  // this leading-wildcard match is an index scan rather than a table scan.
  if (params.q?.trim()) query = query.ilike("search_text", `%${params.q.trim()}%`);

  if (params.openNow) {
    const ids = await openNowProviderIds(at);
    // An empty list is a real answer — nothing is open — and must not be
    // passed to `.in()`, which PostgREST reads as "no constraint" and would
    // silently turn the filter into a no-op.
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  if (params.near) {
    const box = boundingBox(params.near.lat, params.near.lng, params.near.radiusKm);
    query = query
      .gte("latitude", box.minLat)
      .lte("latitude", box.maxLat)
      .gte("longitude", box.minLng)
      .lte("longitude", box.maxLng);
  }

  // Over-fetch when sorting by distance: the database cannot order by it, so
  // the top N by distance is not the top N of any order it can produce. Take a
  // wider slice, sort it here, then cut.
  const fetchLimit = params.near ? Math.min(limit * 6, 400) : limit;
  query = query.order("name").limit(fetchLimit);

  const { data, error } = await query;
  if (error || !data) return [];

  let rows = (data as unknown as Row[]).map((r) => toSummary(r, at));

  if (params.near) {
    const { lat, lng, radiusKm } = params.near;
    rows = rows
      .map((p) => ({
        ...p,
        distance_km:
          p.latitude !== null && p.longitude !== null
            ? distanceKm(lat, lng, p.latitude, p.longitude)
            : null,
      }))
      // The box let the corners through; the circle drops them.
      .filter((p) => p.distance_km !== null && p.distance_km <= radiusKm);
  }

  const bySort =
    params.sort === "name" || !params.near
      ? (a: ProviderSummary, b: ProviderSummary) => a.name.localeCompare(b.name, "fr")
      : (a: ProviderSummary, b: ProviderSummary) =>
          (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);

  rows.sort((a, b) => {
    if (a.is_sponsored !== b.is_sponsored) return a.is_sponsored ? -1 : 1;
    return bySort(a, b);
  });

  return rows.slice(0, limit);
}

/**
 * Just enough to answer "what is this establishment's agenda?".
 *
 * `getProviderBySlug` loads practitioners, services, specialties and hours —
 * five round trips — and the availability endpoint uses exactly one of them.
 * That cost was being paid on every calendar load AND every change of week or
 * view, which is the slowest thing a visitor does on the site.
 */
export async function getProviderAgenda(slug: string): Promise<{
  legacyDoctorId: string | null;
  bookingMode: BookingMode;
  hours: OpeningRange[];
} | null> {
  const supabase = createClient();

  // Opening hours come back embedded rather than as a second query. Two
  // sequential round trips to Supabase cost more than the query itself, and
  // this runs again on every change of week or view.
  const { data } = await supabase
    .from("providers")
    .select(
      "booking_mode, legacy_doctor_id, opening_hours (weekday, opens_at, closes_at)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Row;

  const hours = Array.isArray(row.opening_hours)
    ? (row.opening_hours as Row[])
    : [];

  return {
    legacyDoctorId: row.legacy_doctor_id ? str(row.legacy_doctor_id) : null,
    bookingMode: str(row.booking_mode, "demande") as BookingMode,
    hours: hours
      .map((h) => ({
        weekday: Number(h.weekday),
        // Postgres hands back "08:00:00"; the UI wants "08:00".
        opens_at: str(h.opens_at).slice(0, 5),
        closes_at: str(h.closes_at).slice(0, 5),
      }))
      // An embedded select carries no ORDER BY, and buildAvailability walks
      // the ranges in order.
      .sort((a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at)),
  };
}

/**
 * How many published establishments of each kind — the landing page tiles.
 *
 * A GROUP BY in the database: one request, twelve integers, no rows moved.
 * The obvious client-side alternatives are both bad at the size this annuaire
 * is heading for — `select("kind")` transfers every published row to count
 * them, and twelve head-only counts pay twelve round trips on every page view.
 */
let rpcMissingUntil = 0;

export async function countProvidersByKind(): Promise<Record<string, number>> {
  const supabase = createClient();

  // Without this, a database that has not had the migration applied pays a
  // failed round trip on EVERY page view before falling back — making the
  // "optimisation" slower than what it replaced. The verdict is remembered
  // briefly rather than for the process lifetime, so applying the migration
  // starts working on its own instead of needing a restart.
  const useRpc = Date.now() >= rpcMissingUntil;

  const { data, error } = useRpc
    ? await supabase.rpc("provider_counts_by_kind")
    : { data: null, error: { message: "skipped" } };

  if (useRpc && error) rpcMissingUntil = Date.now() + 5 * 60_000;

  if (!error && Array.isArray(data)) {
    const counts: Record<string, number> = {};
    for (const row of data as unknown as Row[]) {
      const n = Number(row.n);
      if (n > 0) counts[str(row.kind)] = n;
    }
    return counts;
  }

  // The function is added by a migration; until that has run, fall back to
  // counting client-side rather than showing every tile as empty. Correct,
  // just not something to rely on once the annuaire is large.
  const { data: rows } = await supabase
    .from("providers")
    .select("kind")
    .eq("is_published", true);

  const counts: Record<string, number> = {};
  for (const row of (rows ?? []) as unknown as Row[]) {
    const k = str(row.kind);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/**
 * Pharmacies on duty at `at`, nearest first.
 *
 * Reads the shifts and then the establishments, rather than embedding, so a
 * pharmacy whose roster was imported twice cannot appear twice: the ids are
 * deduplicated between the two queries.
 */
export async function listOnDutyPharmacies(
  near?: { lat: number; lng: number },
  at: Date = new Date(),
  limit = 20,
): Promise<ProviderSummary[]> {
  const supabase = createClient();
  const iso = at.toISOString();

  const { data: shifts } = await supabase
    .from("duty_shifts")
    .select("provider_id, ends_at")
    .lte("starts_at", iso)
    .gt("ends_at", iso);

  const rows = (shifts ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  /** Latest end per establishment: "de garde jusqu'à" must not show the earlier
   *  of two adjacent shifts and send someone away an hour too soon. */
  const until = new Map<string, string>();
  for (const r of rows) {
    const id = str(r.provider_id);
    const end = str(r.ends_at);
    const seen = until.get(id);
    if (!seen || new Date(end) > new Date(seen)) until.set(id, end);
  }

  const { data } = await supabase
    .from("providers")
    .select(SUMMARY_FIELDS)
    .eq("is_published", true)
    .in("id", [...until.keys()]);

  let list = ((data ?? []) as unknown as Row[]).map((r) => {
    const summary = toSummary(r, at);
    summary.on_duty_until = until.get(summary.id) ?? null;
    return summary;
  });

  if (near) {
    list = list.map((p) => ({
      ...p,
      distance_km:
        p.latitude !== null && p.longitude !== null
          ? distanceKm(near.lat, near.lng, p.latitude, p.longitude)
          : null,
    }));
    list.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  return list.slice(0, limit);
}

/**
 * One establishment with everything its public profile renders.
 *
 * Children come back embedded, so this is a single round trip rather than the
 * row followed by four more queries. PostgREST resolves each embed through the
 * foreign key, and nests `specialties` inside the join table the same way.
 */
export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  const supabase = createClient();
  const at = new Date();

  const { data } = await supabase
    .from("providers")
    .select(
      FULL_FIELDS +
        // The foreign key is named explicitly because there are TWO paths from
        // providers to practitioners: the direct one, and a many-to-many via
        // provider_specialties.practitioner_id. PostgREST refuses to guess
        // between them (PGRST201) and the whole query fails.
        ", practitioners!practitioners_provider_id_fkey (id, slug, title, full_name, bio, photo_url, languages, booking_mode, accepts_new_patients, is_published, sort_order)" +
        ", services (id, label, code, category, note, amount_millimes, duration_minutes, preparation, result_delay_hours, is_published, sort_order)" +
        ", opening_hours (weekday, opens_at, closes_at)" +
        ", provider_specialties (specialties (id, slug, label, synonyms, kinds))",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Row;

  const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
  const base = toSummary(row, at);

  return {
    ...base,
    legal_name: str(row.legal_name),
    bio: str(row.bio),
    logo_url: str(row.logo_url),
    postcode: str(row.postcode),
    governorate: str(row.governorate),
    phone_alt: str(row.phone_alt),
    email: str(row.email),
    website: str(row.website),
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : ["fr"],
    source: str(row.source, "manuel") as ProviderSource,
    verified_at: row.verified_at ? str(row.verified_at) : null,
    claimed_at: row.claimed_at ? str(row.claimed_at) : null,
    legacy_doctor_id: row.legacy_doctor_id ? str(row.legacy_doctor_id) : null,
    plan: str(row.plan, "gratuit") as ProviderPlan,
    plan_expires_at: row.plan_expires_at ? str(row.plan_expires_at) : null,
    is_published: bool(row.is_published),

    rating_avg: num(row.rating_avg),
    rating_count: Number(row.rating_count ?? 0),

    // An embed carries no WHERE or ORDER BY of its own, so the filtering and
    // ordering the separate queries used to do happens here instead. Dropping
    // either would publish unpublished practitioners, or shuffle the tariffs.
    practitioners: list(row.practitioners)
      .filter((p) => bool(p.is_published))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map(
        (p): Practitioner => ({
          id: str(p.id),
          slug: str(p.slug),
          title: str(p.title, "Dr"),
          full_name: str(p.full_name),
          bio: str(p.bio),
          photo_url: str(p.photo_url),
          languages: Array.isArray(p.languages) ? (p.languages as string[]) : ["fr"],
          booking_mode: str(p.booking_mode, "demande") as BookingMode,
          accepts_new_patients: bool(p.accepts_new_patients),
          specialties: [],
        }),
      ),

    services: list(row.services)
      .filter((sv) => bool(sv.is_published))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map(
        (sv): Service => ({
          id: str(sv.id),
          label: str(sv.label),
          code: str(sv.code),
          category: str(sv.category),
          note: str(sv.note),
          amount_millimes: num(sv.amount_millimes),
          duration_minutes: num(sv.duration_minutes),
          preparation: str(sv.preparation),
          result_delay_hours: num(sv.result_delay_hours),
        }),
      ),

    hours: list(row.opening_hours)
      .map(
        (h): OpeningRange => ({
          weekday: Number(h.weekday),
          // Postgres hands back "08:00:00"; the UI wants "08:00".
          opens_at: str(h.opens_at).slice(0, 5),
          closes_at: str(h.closes_at).slice(0, 5),
        }),
      )
      .sort((a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at)),

    specialties: list(row.provider_specialties)
      .map((l) => l.specialties as Row | null)
      .filter((sp): sp is Row => sp !== null && sp !== undefined)
      .map(
        (sp): Specialty => ({
          id: str(sp.id),
          slug: str(sp.slug),
          label: str(sp.label),
          synonyms: Array.isArray(sp.synonyms) ? (sp.synonyms as string[]) : [],
          kinds: Array.isArray(sp.kinds) ? (sp.kinds as ProviderKind[]) : [],
        }),
      ),
  };
}

/** The duty roster for one establishment, for the calendar on its profile. */
export async function listDutyShifts(
  providerId: string,
  from: Date,
  to: Date,
): Promise<DutyShift[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("duty_shifts")
    .select("id, starts_at, ends_at, kind, note")
    .eq("provider_id", providerId)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at");

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: str(r.id),
    starts_at: str(r.starts_at),
    ends_at: str(r.ends_at),
    kind: str(r.kind, "nuit") as DutyShift["kind"],
    note: str(r.note),
  }));
}

/** The whole taxonomy, for filter lists and the establishment form. */
export async function listSpecialties(): Promise<Specialty[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("specialties")
    .select("id, slug, label, synonyms, kinds")
    .order("sort_order");

  return ((data ?? []) as unknown as Row[]).map((s) => ({
    id: str(s.id),
    slug: str(s.slug),
    label: str(s.label),
    synonyms: Array.isArray(s.synonyms) ? (s.synonyms as string[]) : [],
    kinds: Array.isArray(s.kinds) ? (s.kinds as ProviderKind[]) : [],
  }));
}
