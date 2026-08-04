import type {
  Appointment,
  AppointmentStatus,
  BusyRange,
  NewAppointmentInput,
  NewPatientInput,
  PatientAdminInput,
  SafePatient,
} from "@/types";
import { createClient } from "@/lib/supabase/server";

/**
 * The front desk: patients and appointments, in Supabase.
 *
 * This used to proxy through to the doctor's PC, which meant the secretary
 * could not do her job while he was offline. Now the two stores each own what
 * they are best placed to own — she owns the agenda and the administrative
 * side of a patient, his machine owns the clinical record and file numbers —
 * and his app reconciles them whenever it connects.
 *
 * Row-level security does the enforcing; every query here runs as the signed-in
 * secretary, so a bug in a filter cannot reach another practice's data. The
 * `doctor_id` filters below are belt-and-braces on top of that.
 */

export class FrontDeskError extends Error {
  status: number;
  code?: string;
  /** Extra structured data for the UI, e.g. the patients a name matched. */
  detail?: unknown;

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.name = "FrontDeskError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const PATIENT_FIELDS =
  "id, local_id, numero_dossier, last_name, first_name, father_name, phone, " +
  "gender, age, address, email, job, date_of_birth, insurance_type, " +
  "display_name, pending_edit, created_at";

type PatientRow = {
  id: string;
  local_id: number | null;
  numero_dossier: string | null;
  last_name: string | null;
  first_name: string | null;
  father_name: string | null;
  phone: string | null;
  gender: string | null;
  age: number | null;
  address: string | null;
  email: string | null;
  job: string | null;
  date_of_birth: string | null;
  insurance_type: string | null;
  display_name: string | null;
  pending_edit: boolean | null;
  created_at: string | null;
};

const str = (v: string | null | undefined) => v ?? "";

function toPatient(r: PatientRow): SafePatient {
  return {
    id: r.id,
    first_name: str(r.first_name),
    last_name: str(r.last_name),
    father_name: str(r.father_name),
    display_name: str(r.display_name) || str(r.last_name),
    phone: str(r.phone),
    gender: str(r.gender),
    age: r.age ?? null,
    address: str(r.address),
    email: str(r.email),
    job: str(r.job),
    date_of_birth: str(r.date_of_birth),
    insurance_type: str(r.insurance_type),
    numero_dossier: str(r.numero_dossier),
    created_at: str(r.created_at),
    // Empty until the doctor's app has taken the patient in and issued a file
    // number. The UI says "en attente" rather than showing a blank.
    registered: r.local_id !== null,
  };
}

// ─── patients ────────────────────────────────────────────────────────────────

export async function listPatients(
  doctorId: string,
  search: string,
): Promise<SafePatient[]> {
  // Archived = the doctor deleted them. The row survives so his old
  // appointments keep a name on them, but they are not a patient any more:
  // they must not appear in a search or be bookable again.
  let query = createClient()
    .from("patients")
    .select(PATIENT_FIELDS)
    .eq("doctor_id", doctorId)
    .is("archived_at", null)
    .order("last_name")
    .order("first_name")
    .limit(500);

  const needle = search.trim();
  if (needle) {
    // Postgrest `or` needs the commas escaped out of the value; strip anything
    // that could break out of the filter rather than trying to quote it.
    const safe = needle.replace(/[,()*]/g, " ").trim();
    if (safe) {
      query = query.or(
        [
          `last_name.ilike.*${safe}*`,
          `first_name.ilike.*${safe}*`,
          `phone.ilike.*${safe}*`,
          `numero_dossier.ilike.*${safe}*`,
        ].join(","),
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new FrontDeskError(500, "Impossible de charger les patients.");
  return (data as unknown as PatientRow[]).map(toPatient);
}

export async function getPatient(
  doctorId: string,
  id: string,
): Promise<SafePatient | null> {
  const { data } = await createClient()
    .from("patients")
    .select(PATIENT_FIELDS)
    .eq("doctor_id", doctorId)
    .is("archived_at", null)
    .eq("id", id)
    .maybeSingle();
  return data ? toPatient(data as unknown as PatientRow) : null;
}

/**
 * Registers a patient she met before the doctor's app saw them.
 *
 * The file number is deliberately not settled here: she may suggest one, but
 * only doctor.db knows which numbers have ever been issued, so his app decides
 * and sends the final value back. Until then the patient shows as "en attente".
 */
export async function createPatient(
  doctorId: string,
  input: NewPatientInput & { force?: boolean },
): Promise<{ id: string }> {
  // Same-name guard. Two Ben Ali Mohameds in one practice is common enough to
  // be real and common enough to be a mistake, so ask rather than decide: the
  // secretary confirms and retries with `force`.
  if (!input.force) {
    const { data: clash } = await createClient()
      .from("patients")
      .select("id")
      .eq("doctor_id", doctorId)
      .ilike("last_name", input.last_name.trim())
      .ilike("first_name", input.first_name?.trim() ?? "")
      .limit(1);

    if (clash && clash.length > 0) {
      throw new FrontDeskError(
        409,
        "Un patient portant ce nom existe déjà.",
        "DUPLICATE_PATIENT",
        { existing_id: (clash[0] as { id: string }).id },
      );
    }
  }

  const { data, error } = await createClient()
    .from("patients")
    .insert({
      doctor_id: doctorId,
      last_name: input.last_name.trim(),
      first_name: input.first_name?.trim() ?? "",
      father_name: input.father_name?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      gender: input.gender ?? "",
      age: input.age ?? null,
      address: input.address?.trim() ?? "",
      email: input.email?.trim() ?? "",
      job: input.job?.trim() ?? "",
      date_of_birth: input.date_of_birth?.trim() ?? "",
      insurance_type: input.insurance_type?.trim() ?? "",
      numero_dossier: input.numero_dossier?.trim() ?? "",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new FrontDeskError(500, "Impossible d'enregistrer ce patient.");
  }
  return { id: (data as { id: string }).id };
}

/**
 * Administrative edit.
 *
 * A trigger flags the row so the doctor's app applies the same change to
 * doctor.db on its next sync. The file number is not writable from here: it is
 * his to issue, and a column-level grant is what actually stops it.
 */
export async function updatePatient(
  doctorId: string,
  id: string,
  input: PatientAdminInput,
): Promise<void> {
  const { error } = await createClient()
    .from("patients")
    .update({
      last_name: input.last_name.trim(),
      first_name: input.first_name?.trim() ?? "",
      father_name: input.father_name?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      gender: input.gender ?? "",
      age: input.age ?? null,
      address: input.address?.trim() ?? "",
      email: input.email?.trim() ?? "",
      job: input.job?.trim() ?? "",
      date_of_birth: input.date_of_birth?.trim() ?? "",
      insurance_type: input.insurance_type?.trim() ?? "",
    })
    .eq("doctor_id", doctorId)
    .eq("id", id);

  if (error) throw new FrontDeskError(500, "Impossible de modifier ce patient.");
}

// There is no deletePatient, and there must not be one. Removing a patient
// cascades through consultations, exams, documents and CNAM forms in doctor.db;
// it stays an action only the doctor can take, from his own machine.

// ─── appointments ────────────────────────────────────────────────────────────

const APPOINTMENT_FIELDS =
  "id, patient_id, starts_at, duration_minutes, status, notes, " +
  "patients!inner(display_name, numero_dossier)";

type AppointmentRow = {
  id: string;
  patient_id: string;
  starts_at: string;
  duration_minutes: number | null;
  status: string | null;
  notes: string | null;
  patients: { display_name: string | null; numero_dossier: string | null } | null;
};

/** Postgres hands back "YYYY-MM-DDTHH:MM:SS"; the UI works in the doctor.db form. */
function toLocalStamp(value: string): string {
  return value.replace("T", " ").slice(0, 19);
}

function toAppointment(r: AppointmentRow): Appointment {
  return {
    id: r.id,
    patient_id: r.patient_id,
    patient_name: str(r.patients?.display_name),
    appointment_datetime: toLocalStamp(r.starts_at),
    duration_minutes: r.duration_minutes ?? 30,
    status: (r.status ?? "a_venir") as AppointmentStatus,
    notes: r.notes ?? null,
  };
}

export async function listAppointments(
  doctorId: string,
  from: string,
  to: string,
): Promise<Appointment[]> {
  const { data, error } = await createClient()
    .from("appointments")
    .select(APPOINTMENT_FIELDS)
    .eq("doctor_id", doctorId)
    .gte("starts_at", `${from} 00:00:00`)
    .lte("starts_at", `${to} 23:59:59`)
    .order("starts_at");

  if (error) throw new FrontDeskError(500, "Impossible de charger l'agenda.");
  return (data as unknown as AppointmentRow[]).map(toAppointment);
}

/** The message the database's spacing rule should show as. */
const TOO_CLOSE = "Il doit y avoir au moins 30 minutes entre deux rendez-vous.";

const PAST_DATE = "Impossible de placer un rendez-vous à une date déjà passée.";

/**
 * Refuses a booking into a day that has already gone.
 *
 * Compared as "YYYY-MM-DD" strings, with a day of slack, and both of those are
 * on purpose. `starts_at` is a naive timestamp holding the clinic's wall-clock
 * time, while this runs on a server whose clock is UTC — so an exact instant
 * comparison would reject a perfectly good booking made early in the morning,
 * which is the worst way for this to fail.
 *
 * The UI enforces the precise rule, because it is the side that knows what day
 * it is where the secretary is sitting. What this stops is the case the UI
 * cannot: a tab left open since last week, or a request typed by hand, writing
 * a date from last month. Being one day generous costs nothing against that.
 */
function assertNotPast(datetime: string): void {
  const floor = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (datetime.slice(0, 10) < floor) {
    throw new FrontDeskError(400, PAST_DATE, "PAST_DATE");
  }
}

function mapWriteError(error: { message: string; code?: string }): never {
  // 23P01 is an exclusion-constraint violation: the 30-minute rule.
  if (error.code === "23P01" || error.message.includes("appointments_min_gap")) {
    throw new FrontDeskError(400, TOO_CLOSE, "TOO_CLOSE");
  }
  throw new FrontDeskError(500, "Impossible d'enregistrer le rendez-vous.");
}

export async function createAppointment(
  doctorId: string,
  input: NewAppointmentInput,
): Promise<{ id: string }> {
  // Here rather than in the routes: accepting a request books through this same
  // function, so guarding the one choke point covers both ways in.
  assertNotPast(input.appointment_datetime);

  const { data, error } = await createClient()
    .from("appointments")
    .insert({
      doctor_id: doctorId,
      patient_id: input.patient_id,
      starts_at: input.appointment_datetime,
      duration_minutes: input.duration_minutes || 30,
      status: input.status ?? "a_venir",
      notes: input.notes ?? "",
    })
    .select("id")
    .single();

  if (error) mapWriteError(error);
  return { id: (data as { id: string }).id };
}

export async function updateAppointment(
  doctorId: string,
  id: string,
  input: {
    appointment_datetime?: string;
    duration_minutes?: number;
    status?: string;
    notes?: string | null;
  },
): Promise<void> {
  // A *move* into the past is refused; an appointment already sitting there is
  // not frozen. She still has to fix a duration or add a note on this morning's
  // slot, and the edit form resends the datetime unchanged when she does — so
  // compare against where the appointment currently is, not against the clock.
  if (input.appointment_datetime) {
    const { data: current } = await createClient()
      .from("appointments")
      .select("starts_at")
      .eq("doctor_id", doctorId)
      .eq("id", id)
      .maybeSingle();

    const now = (current as { starts_at?: string } | null)?.starts_at;
    if (!now || toLocalStamp(now) !== input.appointment_datetime) {
      assertNotPast(input.appointment_datetime);
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.appointment_datetime) patch.starts_at = input.appointment_datetime;
  if (input.duration_minutes) patch.duration_minutes = input.duration_minutes;
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes ?? "";

  const { error } = await createClient()
    .from("appointments")
    .update(patch)
    .eq("doctor_id", doctorId)
    .eq("id", id);

  if (error) mapWriteError(error);
}

export async function deleteAppointment(
  doctorId: string,
  id: string,
): Promise<void> {
  const { error } = await createClient()
    .from("appointments")
    .delete()
    .eq("doctor_id", doctorId)
    .eq("id", id);

  if (error) throw new FrontDeskError(500, "Impossible de supprimer ce rendez-vous.");
}

// ─── what visitors may ask ───────────────────────────────────────────────────

/** Free/busy for the public calendar. Times only — never widen this. */
export async function listBusyRanges(
  doctorId: string,
  from: string,
  to: string,
): Promise<BusyRange[]> {
  const { data, error } = await createClient().rpc("public_busy_ranges", {
    p_doctor: doctorId,
    p_from: `${from} 00:00:00`,
    p_to: `${to} 23:59:59`,
  });
  if (error) throw new FrontDeskError(500, "Créneaux indisponibles.");
  return (data ?? []) as BusyRange[];
}

/** What the doctor already knows about a returning patient. */
export type KnownPatient = {
  last_name: string;
  first_name: string;
  gender: string;
  age: number | null;
};

/**
 * Identifies a returning patient from their file number AND their phone.
 *
 * SERVER-SIDE ONLY. The four fields exist to prefill a request form for someone
 * the doctor already knows; they must never be handed to the browser, or a
 * guessable file number becomes a way to read the patient list. `/api/public/
 * verify-dossier` returns a bare boolean for exactly that reason.
 */
export async function findPatientByDossier(
  doctorId: string,
  dossier: string,
  phone: string,
): Promise<KnownPatient | null> {
  const { data } = await createClient().rpc("public_patient_by_dossier", {
    p_doctor: doctorId,
    p_dossier: dossier,
    p_phone: phone,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const r = row as Partial<KnownPatient>;
  return {
    last_name: r.last_name ?? "",
    first_name: r.first_name ?? "",
    gender: r.gender ?? "",
    age: r.age ?? null,
  };
}
