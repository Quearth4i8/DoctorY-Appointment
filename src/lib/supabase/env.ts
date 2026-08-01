/**
 * Reads the Supabase environment variables, failing loudly when one is missing.
 *
 * Next.js inlines NEXT_PUBLIC_* at build time, so these must be referenced as
 * full literal `process.env.X` expressions — never `process.env[name]`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill in the Supabase keys.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function supabaseServiceRoleKey(): string {
  return required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}
