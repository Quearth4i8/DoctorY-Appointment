export interface LicenseKey {
  key: string;
  label: string;
  max_activations: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  activation_count: number;
}

export interface LicenseActivation {
  id: string;
  license_key: string;
  machine_fingerprint: string;
  hostname: string | null;
  activated_at: string;
  last_seen_at: string;
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
    const d = data as { error?: string } | null;
    throw new AdminApiError(res.status, d?.error ?? "Une erreur est survenue.");
  }
  return data as T;
}

export const fetchLicenses = () => request<LicenseKey[]>("/api/admin/licenses");

export const createLicense = (input: {
  label: string;
  max_activations: number;
  expires_at: string | null;
}) =>
  request<{ key: string }>("/api/admin/licenses", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateLicense = (
  key: string,
  input: { max_activations: number; expires_at: string | null; revoked: boolean },
) =>
  request<{ success: true }>(`/api/admin/licenses/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteLicense = (key: string) =>
  request<{ success: true }>(`/api/admin/licenses/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });

export const fetchActivations = (key: string) =>
  request<LicenseActivation[]>(
    `/api/admin/licenses/${encodeURIComponent(key)}/activations`,
  );

/** Every activation across every key, for the dashboard's growth chart. */
export const fetchAllActivations = () =>
  request<LicenseActivation[]>("/api/admin/activations");

export const releaseActivation = (key: string, id: string) =>
  request<{ success: true }>(
    `/api/admin/licenses/${encodeURIComponent(key)}/activations/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

// ─── Doctors & staff ───────────────────────────────────────────────────────

export interface AdminDoctor {
  id: string;
  slug: string;
  full_name: string;
  title: string;
  specialty: string;
  city: string;
  phone: string;
  email: string;
  is_published: boolean;
  paired: boolean;
  remote_seen_at: string | null;
  staff_count: number;
  created_at: string;
}

export interface AdminStaff {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  doctor_id: string | null;
  doctor_name: string | null;
  created_at: string;
}

export const fetchDoctors = () => request<AdminDoctor[]>("/api/admin/doctors");

export const fetchStaff = () => request<AdminStaff[]>("/api/admin/staff");

export const reassignStaff = (userId: string, doctorId: string | null) =>
  request<{ success: true }>(`/api/admin/staff/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ doctor_id: doctorId }),
  });

export const revokeStaff = (userId: string) =>
  request<{ success: true }>(`/api/admin/staff/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

// ─── App overview ────────────────────────────────────────────────────────────

export interface AdminAppStats {
  doctors_total: number;
  doctors_published: number;
  staff_total: number;
  staff_secretaries: number;
  requests_total: number;
  requests_pending: number;
  requests_accepted: number;
  requests_refused: number;
  appointments_total: number;
  appointments_upcoming: number;
  patients_total: number;
  patients_active: number;
  license_keys_total: number;
  license_machines_total: number;
}

export interface AdminRequestsByDay {
  day: string;
  count: number;
}

export const fetchAppStats = () => request<AdminAppStats>("/api/admin/stats");

export const fetchRequestsOverTime = () =>
  request<AdminRequestsByDay[]>("/api/admin/stats/requests-over-time");
