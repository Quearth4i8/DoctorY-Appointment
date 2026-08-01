import "server-only";

import type { Appointment, PatientAdminInput, SafePatient } from "@/types";

/**
 * Server-only client for the doctor's desktop API.
 *
 * SECURITY: this module is the single gate between the secretary's app and the
 * doctor's database. The browser never talks to the desktop API directly — it
 * only calls this app's own /api routes, which call the functions here. Two
 * rules are enforced at this boundary:
 *
 *   1. Endpoint allowlist — only patients (list, create, administrative update)
 *      and appointments are reachable. Medical endpoints (consultations,
 *      clinical exams, documents, CNAM forms, specialty metrics, profile,
 *      dashboard) are never called. Patient DELETE is deliberately absent: it
 *      cascades through the whole medical record, so it stays the doctor's.
 *   2. Field projection — patient payloads are stripped to identity, contact and
 *      administrative fields before they leave this module. Nothing the doctor
 *      records (notes, blood group, habits, treatments, referrer) is exposed.
 *
 * Updates go to PATCH /api/patients/{id}/admin, never PUT /api/patients/{id}:
 * the PUT endpoint rewrites every column, so sending it our narrower payload
 * would null out the clinical fields it does not know about.
 */

/**
 * Where a given doctor's machine is, and the key that opens it.
 *
 * Every practice runs its own desktop app behind its own tunnel, so there is no
 * single address: the endpoint is resolved per doctor. `get_doctor_endpoint` is
 * gated by SERVER_API_SECRET rather than a service-role key, because the worst
 * a leak of that secret can do is expose endpoint credentials instead of the
 * whole database.
 *
 * DOCTOR_API_URL still wins when set — that is local development, where the
 * backend listens unauthenticated on 127.0.0.1 and there is nothing to resolve.
 */
export type DoctorEndpoint = { url: string; token: string };

const ENDPOINT_TTL_MS = 30_000;
const endpointCache = new Map<string, { value: DoctorEndpoint; at: number }>();

function devEndpoint(): DoctorEndpoint | null {
  const url = process.env.DOCTOR_API_URL;
  if (!url) return null;
  return { url, token: process.env.DOCTOR_API_TOKEN ?? "" };
}

async function resolveEndpoint(doctorId: string): Promise<DoctorEndpoint> {
  const dev = devEndpoint();
  if (dev) return dev;

  const cached = endpointCache.get(doctorId);
  if (cached && Date.now() - cached.at < ENDPOINT_TTL_MS) return cached.value;

  const secret = process.env.SERVER_API_SECRET;
  if (!secret) {
    console.error(
      "[doctor-api] SERVER_API_SECRET is not set — cannot look up any practice's endpoint.",
    );
    throw new DoctorApiError(503, UNREACHABLE, "BACKEND_UNREACHABLE");
  }

  const { createClient } = await import("@/lib/supabase/server");
  const { data, error } = await createClient().rpc("get_doctor_endpoint", {
    p_doctor_id: doctorId,
    p_server_secret: secret,
  });

  const row = Array.isArray(data) ? data[0] : data;
  const url = (row as { api_url?: string } | null)?.api_url ?? "";
  const token = (row as { api_token?: string } | null)?.api_token ?? "";

  if (error || !url) {
    // Never paired, or the app has not registered since its last restart.
    throw new DoctorApiError(503, UNREACHABLE, "BACKEND_UNREACHABLE");
  }

  const value = { url: url.replace(/\/+$/, ""), token };
  endpointCache.set(doctorId, { value, at: Date.now() });
  return value;
}

const UNREACHABLE =
  "Connexion impossible. Vérifiez que l'application du médecin est ouverte.";

export class DoctorApiError extends Error {
  status: number;
  /** Raw machine code from the backend, when present (e.g. "DUPLICATE_PATIENT"). */
  code?: string;
  /** Extra structured data from the backend error (e.g. existing_id). */
  detail?: unknown;

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.name = "DoctorApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type apiInit = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

async function call(
  doctorId: string,
  path: string,
  init: apiInit = {},
): Promise<unknown> {
  const endpoint = await resolveEndpoint(doctorId);
  const url = new URL(`${endpoint.url}${path}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  // Deployed, this reaches the practice through its tunnel, whose port refuses
  // anything without that practice's key. Locally the backend listens
  // unauthenticated on 127.0.0.1 and simply ignores the header.
  const headers: Record<string, string> = {};
  if (init.body) headers["Content-Type"] = "application/json";
  if (endpoint.token) headers["x-doctory-token"] = endpoint.token;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new DoctorApiError(503, UNREACHABLE, "BACKEND_UNREACHABLE");
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    // FastAPI puts errors under `detail`, which may be a string or an object.
    const detail = (data as { detail?: unknown } | null)?.detail;
    if (detail && typeof detail === "object") {
      const d = detail as { code?: string; message?: string };
      throw new DoctorApiError(res.status, d.message ?? "Erreur", d.code, detail);
    }
    throw new DoctorApiError(
      res.status,
      typeof detail === "string" ? detail : "Une erreur est survenue.",
    );
  }

  return data;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Keep only the fields the secretary is allowed to see. This is an allowlist,
 * not a blocklist: any column added to `patients` later is dropped by default
 * rather than silently leaking.
 */
function projectPatient(raw: Record<string, unknown>): SafePatient {
  const ageRaw = raw["age"];
  const text = (key: string) => String(raw[key] ?? "");
  return {
    id: Number(raw["id"]),
    first_name: text("first_name"),
    last_name: text("last_name"),
    father_name: text("father_name"),
    display_name: text("display_name"),
    phone: text("phone"),
    gender: text("gender"),
    age: ageRaw === null || ageRaw === undefined || ageRaw === "" ? null : Number(ageRaw),
    address: text("address"),
    email: text("email"),
    job: text("job"),
    date_of_birth: text("date_of_birth"),
    insurance_type: text("insurance_type"),
    numero_dossier: text("numero_dossier"),
    created_at: text("created_at"),
  };
}

// ─── Patients (allowed: list, create, administrative update — never delete) ──

export async function searchPatients(
  doctorId: string,
  search: string,
): Promise<SafePatient[]> {
  const rows = (await call(doctorId, "/api/patients", { query: { search } })) as Record<
    string,
    unknown
  >[];
  return (rows ?? []).map(projectPatient);
}

/**
 * Finds a patient by numéro de dossier AND phone, for the public form.
 *
 * SECURITY: both must match the same record. File numbers are sequential and
 * therefore guessable, so the dossier alone is not an identity — requiring the
 * phone as a second factor is what stops someone walking "1/2026", "2/2026", …
 * to enumerate the doctor's patients.
 *
 * The result is used ONLY on the server, to fill in a request the visitor
 * would otherwise have to retype. It is never returned to the browser.
 */
export async function findPatientByDossier(
  doctorId: string,
  dossier: string,
  phone: string,
): Promise<SafePatient | null> {
  const wanted = dossier.trim().toLowerCase();
  const wantedPhone = phone.replace(/\D/g, "");
  if (!wanted || wantedPhone.length < 6) return null;

  // The backend search is a LIKE across several columns, so match exactly here.
  const rows = await searchPatients(doctorId, dossier.trim());
  return (
    rows.find(
      (p) =>
        p.numero_dossier.trim().toLowerCase() === wanted &&
        samePhone(p.phone, wantedPhone),
    ) ?? null
  );
}

/**
 * Compares phone numbers the way a human would.
 *
 * "+216 22 764 488" and "22764488" are the same number, but the country code
 * makes them differ as strings — so compare on the national part: equal, or one
 * ends with the other. The 8-digit floor keeps the suffix rule from matching
 * two unrelated numbers that happen to share a tail.
 */
function samePhone(a: string, b: string): boolean {
  const x = a.replace(/\D/g, "");
  const y = b.replace(/\D/g, "");
  if (!x || !y) return false;
  if (x === y) return true;

  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  return shorter.length >= 8 && longer.endsWith(shorter);
}

/** The exact payload the secretary may write — clinical columns are absent. */
function adminPayload(input: PatientAdminInput) {
  return {
    last_name: input.last_name,
    first_name: input.first_name ?? "",
    father_name: input.father_name ?? "",
    phone: input.phone ?? "",
    gender: input.gender ?? "",
    age: input.age ?? null,
    address: input.address ?? "",
    email: input.email ?? "",
    job: input.job ?? "",
    date_of_birth: input.date_of_birth ?? "",
    insurance_type: input.insurance_type ?? "",
    numero_dossier: input.numero_dossier ?? "",
  };
}

export async function createPatient(
  doctorId: string,
  input: PatientAdminInput & { force?: boolean },
): Promise<{ id: number }> {
  const data = (await call(doctorId, "/api/patients", {
    method: "POST",
    body: { ...adminPayload(input), force: input.force ?? false },
  })) as { id: number };
  return { id: Number(data.id) };
}

/**
 * Administrative update. Targets PATCH /api/patients/{id}/admin, which writes
 * only the columns above — the doctor's clinical fields are left untouched.
 */
export async function updatePatientAdmin(
  doctorId: string,
  id: number,
  input: PatientAdminInput,
): Promise<void> {
  await call(doctorId, `/api/patients/${id}/admin`, {
    method: "PATCH",
    body: adminPayload(input),
  });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function listAppointmentsRange(
  doctorId: string,
  from: string,
  to: string,
): Promise<Appointment[]> {
  const rows = (await call(doctorId, "/api/appointments", {
    query: { from, to },
  })) as Appointment[];
  return rows ?? [];
}

/** A block of time the doctor is not free. Times only — deliberately. */
export type BusyRange = { start: string; end: string };

/**
 * Occupied time ranges for the PUBLIC availability grid.
 *
 * This is the only appointment data that ever leaves the building, so it is
 * projected down to two timestamps. No id, no patient_id, no patient_name, no
 * notes, no status — a visitor learns that a slot is taken and nothing else
 * about who is taking it. Never widen this return type.
 *
 * Cancelled appointments free their slot, so they are dropped.
 */
export async function listBusyRanges(
  doctorId: string,
  from: string,
  to: string,
): Promise<BusyRange[]> {
  const rows = (await call(doctorId, "/api/appointments", {
    query: { from, to },
  })) as Record<string, unknown>[];

  return (rows ?? [])
    .filter((r) => String(r["status"] ?? "") !== "annule")
    .map((r) => {
      // doctor.db stores "YYYY-MM-DD HH:MM:SS" in the practice's local time.
      const start = new Date(String(r["appointment_datetime"]).replace(" ", "T"));
      const minutes = Number(r["duration_minutes"]) || 30;
      return {
        start: start.toISOString(),
        end: new Date(start.getTime() + minutes * 60_000).toISOString(),
      };
    })
    .filter((r) => !Number.isNaN(Date.parse(r.start)));
}

export async function createAppointment(doctorId: string, input: {
  patient_id: number;
  appointment_datetime: string;
  duration_minutes: number;
  notes?: string | null;
  status?: string;
}): Promise<{ id: number }> {
  const data = (await call(doctorId, "/api/appointments", {
    method: "POST",
    body: {
      patient_id: input.patient_id,
      appointment_datetime: input.appointment_datetime,
      duration_minutes: input.duration_minutes,
      notes: input.notes ?? null,
      status: input.status ?? "a_venir",
    },
  })) as { id: number };
  return { id: Number(data.id) };
}

export async function updateAppointment(
  doctorId: string,
  id: number,
  input: {
    appointment_datetime: string;
    duration_minutes: number;
    status: string;
    notes?: string | null;
  },
): Promise<void> {
  await call(doctorId, `/api/appointments/${id}`, {
    method: "PUT",
    body: {
      appointment_datetime: input.appointment_datetime,
      duration_minutes: input.duration_minutes,
      status: input.status,
      notes: input.notes ?? null,
    },
  });
}

export async function updateAppointmentStatus(
  doctorId: string,
  id: number,
  status: string,
): Promise<void> {
  await call(doctorId, `/api/appointments/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function deleteAppointment(
  doctorId: string,
  id: number,
): Promise<void> {
  await call(doctorId, `/api/appointments/${id}`, { method: "DELETE" });
}
