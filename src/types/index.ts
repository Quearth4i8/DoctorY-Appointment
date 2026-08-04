// Status values stored by the doctor's desktop app (French).
export type AppointmentStatus = "a_venir" | "approuve" | "passe" | "annule";

// The only patient fields this app ever holds: identity, contact and
// administrative data. Everything the doctor records — notes, blood_group,
// habits, external_treatments, referred_by — has no column in Supabase at all
// and never leaves his machine (see src/lib/front-desk.ts).
export type SafePatient = {
  /** Supabase row id. The doctor's own numeric id stays on his machine. */
  id: string;
  first_name: string;
  last_name: string;
  father_name: string;
  display_name: string;
  phone: string;
  gender: string;
  age: number | null;
  // Administrative fields the secretary may read and edit.
  address: string;
  email: string;
  job: string;
  date_of_birth: string;
  insurance_type: string;
  /** Empty until the doctor's app has issued one. */
  numero_dossier: string;
  created_at: string;
  /** False while the doctor's app has not taken this patient in yet. */
  registered: boolean;
};

/** The administrative fields the secretary is allowed to write. */
export type PatientAdminInput = {
  last_name: string;
  first_name?: string;
  father_name?: string;
  phone?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  email?: string;
  job?: string;
  date_of_birth?: string;
  insurance_type?: string;
  numero_dossier?: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  patient_name: string;
  appointment_datetime: string; // "YYYY-MM-DD HH:MM:SS"
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
};

export type NewPatientInput = PatientAdminInput & {
  first_name?: string;
};

/**
 * A block of time the doctor is not free. Times only — deliberately.
 *
 * This is what the public calendar is built from, so it must never grow an id,
 * a patient or a reason: publishing those would tell any visitor who is seeing
 * the doctor and when.
 */
export type BusyRange = { start: string; end: string };

// ─── Public doctor profiles (Supabase) ───────────────────────────────────────

/** ["08:00", "13:00"] — a single opening range. */
export type HourRange = [string, string];

/** `day` is 1 = Monday … 7 = Sunday. Missing or empty means closed. */
export type DayHours = { day: number; ranges: HourRange[] };

export type Tariff = { label: string; amount: number; note?: string };

/**
 * What the public sees about a doctor. Consultation hours are published here;
 * the agenda never is.
 */
export type Doctor = {
  id: string;
  slug: string;
  title: string;
  full_name: string;
  specialty: string;
  bio: string;
  photo_url: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  /** Both set, or the map is hidden. */
  latitude: number | null;
  longitude: number | null;
  hours: DayHours[];
  tariffs: Tariff[];
  is_published: boolean;
  /** Current tunnel address published by the desktop app. Never the key. */
  remote_api_url: string;
  /** Last time the desktop app announced itself. */
  remote_seen_at: string | null;
};

export const DAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

// ─── Public appointment requests (Supabase, not doctor.db) ───────────────────

export type RequestStatus = "en_attente" | "accepte" | "refuse";

/**
 * A request submitted from the public form. It is NOT a patient and NOT an
 * appointment — nothing reaches doctor.db until the secretary accepts it.
 */
export type AppointmentRequest = {
  id: string;
  created_at: string;
  last_name: string;
  first_name: string;
  phone: string;
  gender: string;
  age: number | null;
  reason: string;
  /** Whether the visitor says they are already a patient of this doctor. */
  is_existing_patient: boolean;
  /** Their file number, when they claim to be an existing patient. */
  numero_dossier: string;
  /** True when that file number + phone matched a real record in doctor.db. */
  dossier_verified: boolean;
  preferred_at: string | null;
  preferred_period: "" | "matin" | "apres_midi";
  status: RequestStatus;
  reviewed_at: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  staff_notes: string;
  /** The patient and appointment this request became. Null while pending. */
  patient_id: string | null;
  appointment_id: string | null;
};

/** What the secretary sends when approving a request. */
export type AcceptRequestInput = {
  /** Link to this existing patient, or omit to create a new one. */
  patient_id?: string | null;
  appointment_datetime: string; // "YYYY-MM-DD HH:MM:SS"
  duration_minutes: number;
  staff_notes?: string;
};

export type NewAppointmentInput = {
  patient_id: string;
  appointment_datetime: string; // "YYYY-MM-DD HH:MM:SS"
  duration_minutes: number;
  notes?: string | null;
  status?: AppointmentStatus;
};
