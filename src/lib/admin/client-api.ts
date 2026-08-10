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
