import type {
  AcceptRequestInput,
  Appointment,
  AppointmentRequest,
  NewAppointmentInput,
  NewPatientInput,
  PatientAdminInput,
  RequestStatus,
  SafePatient,
} from "@/types";

/** Error carrying the friendly message + machine code from an API response. */
export class ApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
      : init?.headers,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const d = data as { error?: string; code?: string; detail?: unknown } | null;
    throw new ApiError(
      res.status,
      d?.error ?? "Une erreur est survenue.",
      d?.code,
      d?.detail,
    );
  }

  return data as T;
}

export function fetchWeek(from: string, to: string): Promise<Appointment[]> {
  return request<Appointment[]>(
    `/api/appointments?from=${from}&to=${to}`,
  );
}

export function searchPatients(search: string): Promise<SafePatient[]> {
  return request<SafePatient[]>(
    `/api/patients?search=${encodeURIComponent(search)}`,
  );
}

export function createPatient(
  input: NewPatientInput & { force?: boolean },
): Promise<{ id: string }> {
  return request<{ id: string }>("/api/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Administrative edit. There is no deletePatient — that stays the doctor's. */
export function updatePatient(
  id: string,
  input: PatientAdminInput,
): Promise<unknown> {
  return request(`/api/patients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAppointment(
  input: NewAppointmentInput,
): Promise<{ id: string }> {
  return request<{ id: string }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppointment(
  id: string,
  input: {
    appointment_datetime: string;
    duration_minutes: number;
    status: string;
    notes?: string | null;
  },
): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function setAppointmentStatus(
  id: string,
  status: string,
): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAppointment(id: string): Promise<unknown> {
  return request(`/api/appointments/${id}`, { method: "DELETE" });
}

// ─── Public appointment requests ─────────────────────────────────────────────

export function fetchRequests(
  status: RequestStatus | "toutes",
): Promise<AppointmentRequest[]> {
  return request<AppointmentRequest[]>(`/api/requests?status=${status}`);
}

export function refuseRequest(id: string, staffNotes = ""): Promise<unknown> {
  return request(`/api/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "refuse", staff_notes: staffNotes }),
  });
}

/** Approving registers the patient (if new) and books the appointment. */
export function acceptRequest(
  id: string,
  input: AcceptRequestInput,
): Promise<{ patient_id: string; appointment_id: string }> {
  return request(`/api/requests/${id}/accept`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
