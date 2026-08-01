-- Self-registering tunnel address.
--
-- The practice has no domain, so the doctor's PC uses a free quick tunnel whose
-- URL changes on every restart. Hardcoding it in the host's environment would
-- break each time he reboots, so the desktop app publishes its own current
-- address here and the website looks it up.
--
-- What is stored and what is not:
--   * remote_api_url    the tunnel address. NOT a secret — every endpoint
--                       behind it answers 401 without the token.
--   * remote_token_hash sha256 of the shared token, used ONLY to prove that a
--                       registration really comes from the doctor's machine.
--                       The token itself lives in the app's settings file and
--                       in the website's environment, never in this table.
--   * remote_seen_at    last successful registration, so the UI can say
--                       whether the cabinet is currently reachable.

alter table public.doctors
  add column if not exists remote_api_url    text not null default '',
  add column if not exists remote_token_hash text not null default '',
  add column if not exists remote_seen_at    timestamptz;

comment on column public.doctors.remote_token_hash is
  'sha256 of the desktop app''s remote_api_token. Never store the token itself.';

create extension if not exists pgcrypto with schema extensions;

/**
 * Called by the doctor's desktop app each time its tunnel address changes.
 *
 * SECURITY DEFINER so it can update a row the anon role cannot write, but it
 * refuses unless the caller proves it holds the token. Without that check
 * anyone could point the practice's address at their own server and collect
 * the token the website sends with every request.
 */
create or replace function public.register_doctor_endpoint(
  p_slug  text,
  p_token text,
  p_url   text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_id   uuid;
begin
  if coalesce(p_url, '') !~ '^https://[a-zA-Z0-9.-]+' then
    raise exception 'INVALID_URL';
  end if;

  select id into v_id
  from doctors
  where slug = p_slug
    and remote_token_hash <> ''
    and remote_token_hash = v_hash;

  if v_id is null then
    raise exception 'INVALID_TOKEN';
  end if;

  update doctors
  set remote_api_url = p_url,
      remote_seen_at = now()
  where id = v_id;
end;
$$;

revoke all on function public.register_doctor_endpoint(text, text, text) from public;
grant execute on function public.register_doctor_endpoint(text, text, text) to anon, authenticated;

-- The hash is written once by staff from the settings page; it must never be
-- readable by the public, so keep it out of any anon-facing select by relying
-- on the existing column-free policies and querying it explicitly server-side.
