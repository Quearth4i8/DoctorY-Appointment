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

// ─── The annuaire (Supabase: providers, practitioners, services…) ────────────
//
// `Doctor` above is the old one-practitioner-per-cabinet shape and still backs
// the existing pages. These are what replaces it: an establishment of any
// trade, the practitioners inside it, and what it offers.

export type ProviderKind =
  | "medecin"
  | "clinique"
  | "hopital"
  | "pharmacie"
  | "parapharmacie"
  | "laboratoire"
  | "imagerie"
  | "dentiste"
  | "kinesitherapie"
  | "opticien"
  | "infirmier"
  | "sage_femme";

/**
 * How a patient reaches an establishment — the field that decides what its
 * public profile renders.
 *
 * `agenda` is the only mode that may show a time, because it is the only one
 * where the times are real: they come from the DoctorY desktop app over the
 * pairing link. `demande` takes a wish and answers later. `aucune` has nothing
 * to book and is the correct answer for a pharmacy, not a lesser one.
 */
export type BookingMode = "agenda" | "demande" | "aucune";

export type ProviderPlan = "gratuit" | "verifie" | "sponsorise";
export type ProviderSource = "manuel" | "import" | "revendique";

export type Specialty = {
  id: string;
  slug: string;
  label: string;
  synonyms: string[];
  kinds: ProviderKind[];
};

/** One continuous opening range. `weekday` is 1 = Monday … 7 = Sunday. */
export type OpeningRange = {
  weekday: number;
  opens_at: string; // "08:00"
  closes_at: string; // "13:00"
};

export type Service = {
  id: string;
  label: string;
  code: string;
  category: string;
  note: string;
  /** Millimes. Divide by 1000 for dinars — never store the divided value. */
  amount_millimes: number | null;
  duration_minutes: number | null;
  preparation: string;
  result_delay_hours: number | null;
};

export type Practitioner = {
  id: string;
  slug: string;
  title: string;
  full_name: string;
  bio: string;
  photo_url: string;
  languages: string[];
  booking_mode: BookingMode;
  accepts_new_patients: boolean;
  specialties: string[];
};

/** A pharmacy's on-duty window. Both ends are ISO instants. */
export type DutyShift = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: "nuit" | "jour" | "ferie";
  note: string;
};

export type Provider = {
  id: string;
  kind: ProviderKind;
  slug: string;

  name: string;
  legal_name: string;
  bio: string;
  photo_url: string;
  logo_url: string;

  address: string;
  city: string;
  postcode: string;
  governorate: string;
  latitude: number | null;
  longitude: number | null;

  phone: string;
  phone_alt: string;
  email: string;
  website: string;
  languages: string[];

  booking_mode: BookingMode;

  accepts_cnam: boolean;
  third_party_payer: boolean;
  wheelchair_access: boolean;
  accepts_new_patients: boolean;
  open_24_7: boolean;
  has_emergency: boolean;

  source: ProviderSource;
  /** Set when the operator has checked this establishment exists as described. */
  verified_at: string | null;
  claimed_at: string | null;

  plan: ProviderPlan;
  plan_expires_at: string | null;
  /**
   * Whether the paid placement is live *right now*. Derived rather than
   * stored: a subscription that lapsed last night must stop buying position
   * this morning without a job having run.
   */
  is_sponsored: boolean;

  is_published: boolean;

  /**
   * The `doctors` row this establishment was backfilled from, or null when it
   * was created natively.
   *
   * Appointments in Supabase are still keyed to a doctor, so this is what
   * makes a live agenda resolvable. A provider without one has no occupied
   * ranges to check against — which is why the profile must NOT render a slot
   * grid for it: every hour would come back free, which is a lie rather than
   * an empty state.
   */
  legacy_doctor_id: string | null;

  /** Only ever populated when the query asked for them. */
  specialties: Specialty[];
  practitioners: Practitioner[];
  services: Service[];
  hours: OpeningRange[];
};

/** A provider as the results list and the map need it — no children loaded. */
export type ProviderSummary = Pick<
  Provider,
  | "id"
  | "kind"
  | "slug"
  | "name"
  | "photo_url"
  | "address"
  | "city"
  | "latitude"
  | "longitude"
  | "phone"
  | "booking_mode"
  | "accepts_cnam"
  | "third_party_payer"
  | "wheelchair_access"
  | "accepts_new_patients"
  | "open_24_7"
  | "has_emergency"
  | "is_sponsored"
> & {
  verified: boolean;
  specialties: string[];
  /** Kilometres from the search origin, when one was given. */
  distance_km: number | null;
  /** Cheapest published service, in millimes. */
  from_millimes: number | null;
  /** Set for pharmacies when a duty shift covers now. */
  on_duty_until: string | null;
};

export type ProviderSearchParams = {
  q?: string;
  kinds?: ProviderKind[];
  specialty?: string;
  city?: string;
  /** Sort and filter by distance from here. */
  near?: { lat: number; lng: number; radiusKm: number };
  openNow?: boolean;
  onDuty?: boolean;
  cnam?: boolean;
  thirdParty?: boolean;
  wheelchair?: boolean;
  acceptingNew?: boolean;
  languages?: string[];
  sort?: "distance" | "soonest" | "name";
  limit?: number;
  /** Opaque cursor from the previous page. */
  cursor?: string | null;
};

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  medecin: "Médecin",
  clinique: "Clinique",
  hopital: "Hôpital",
  pharmacie: "Pharmacie",
  parapharmacie: "Parapharmacie",
  laboratoire: "Laboratoire",
  imagerie: "Imagerie",
  dentiste: "Dentiste",
  kinesitherapie: "Kinésithérapie",
  opticien: "Opticien",
  infirmier: "Infirmier",
  sage_femme: "Sage-femme",
};

/**
 * The booking mode a kind gets when its profile is first created.
 *
 * A default, never a rule: a clinic that pairs a machine moves to `agenda`,
 * and a parapharmacie that wants appointments may ask for `demande`. What
 * this encodes is only which answer is right for most of them on day one.
 */
export const DEFAULT_BOOKING_MODE: Record<ProviderKind, BookingMode> = {
  medecin: "agenda",
  clinique: "agenda",
  hopital: "demande",
  pharmacie: "aucune",
  parapharmacie: "aucune",
  laboratoire: "demande",
  imagerie: "demande",
  dentiste: "agenda",
  kinesitherapie: "agenda",
  opticien: "demande",
  infirmier: "demande",
  sage_femme: "agenda",
};

/** Millimes → "45 DT" / "45,500 DT". Never does float arithmetic on dinars. */
export function formatMillimes(amount: number | null): string {
  if (amount === null || amount === undefined) return "";
  const dinars = Math.trunc(amount / 1000);
  const rest = amount % 1000;
  if (rest === 0) return `${dinars} DT`;
  return `${dinars},${String(rest).padStart(3, "0")} DT`;
}
