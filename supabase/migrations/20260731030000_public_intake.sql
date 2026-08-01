-- Public appointment requests: intake hardening.
--
-- Submissions no longer go from the browser straight to Supabase. They go to
-- this app's POST /api/public/requests, which verifies a Cloudflare Turnstile
-- token and applies a per-IP / per-phone daily cap before inserting with the
-- service role. That means `anon` needs no privilege on the table at all — so
-- take the INSERT grant and the insert policy back off it.

drop policy if exists "anyone can submit a request" on public.appointment_requests;
revoke all on public.appointment_requests from anon;

alter table public.appointment_requests
  -- What the visitor asked for: a day, and roughly when in that day. They
  -- cannot see the agenda, so asking for an exact slot would be theatre.
  add column if not exists preferred_period text not null default ''
    check (preferred_period in ('', 'matin', 'apres_midi')),
  -- Salted hash, never the raw address: enough to rate-limit a repeat
  -- submitter, useless as a record of who visited.
  add column if not exists submitted_ip_hash text;

-- Backs the two throttle lookups (recent by ip hash, recent by phone).
create index if not exists appointment_requests_ip_recent_idx
  on public.appointment_requests (submitted_ip_hash, created_at desc);

create index if not exists appointment_requests_phone_recent_idx
  on public.appointment_requests (phone, created_at desc);
