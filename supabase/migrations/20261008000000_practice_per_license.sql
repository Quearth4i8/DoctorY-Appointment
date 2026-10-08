-- One practice per licence, created by the desktop app itself.
--
-- A pairing key was only accepted once it sat in `doctors.remote_token`, and
-- the only way a new key got there was the first-secretary adoption of an
-- EMPTY practice (20260926050000). Nothing ever created a practice, so the
-- first installation used up the seeded one and every later doctor — or the
-- same doctor on a fresh PC — read "Cette clé de liaison n'est pas reconnue"
-- with the right key in hand.
--
-- The desktop app is what knows the key, and it already proves who it is to
-- this database: an active licence, activated on this very machine
-- (activate_license). So that proof is what creates the practice:
--
--   * key already bound           → heartbeat as before (address, last seen)
--   * licence without a practice  → a new, unpublished practice on this key
--   * licence's practice, no staff yet → moved to this key (a reinstall
--                                        before anyone signed up)
--   * licence's practice with staff    → left alone: changing its key stays
--                                        with that practice's secretaries
--                                        (link_doctor_endpoint), as before.
--
-- A key nobody's licence vouches for still creates nothing, so this is no
-- way in for a made-up key, and a new practice is never published.

alter table public.doctors
  add column if not exists license_key text
    references public.license_keys(key) on delete set null;

create unique index if not exists doctors_license_key_unique
  on public.doctors (license_key)
  where license_key is not null;

comment on column public.doctors.license_key is
  'The licence this practice belongs to. Set by register_practice() from the desktop app.';

/** The licence, if it is active and this machine is one of its activations. */
create or replace function public.proven_license(p_license_key text, p_fingerprint text)
returns public.license_keys
language sql
stable
security definer
set search_path = public
as $$
  select k.*
  from license_keys k
  join license_activations a
    on a.license_key = k.key
   and a.machine_fingerprint = btrim(coalesce(p_fingerprint, ''))
  where k.key = btrim(coalesce(p_license_key, ''))
    and not k.revoked
    and (k.expires_at is null or k.expires_at > now());
$$;

revoke all on function public.proven_license(text, text) from public, anon, authenticated;

/**
 * Called by the desktop app's heartbeat. Returns what happened:
 * 'linked' | 'created' | 'rebound' | 'other_key'.
 */
create or replace function public.register_practice(
  p_token       text,
  p_url         text,
  p_license_key text,
  p_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := btrim(coalesce(p_token, ''));
  v_lic   public.license_keys;
  v_doc   public.doctors;
begin
  if length(v_token) < 16 then
    raise exception 'INVALID_KEY';
  end if;
  if coalesce(p_url, '') !~ '^https://[a-zA-Z0-9.-]+' then
    raise exception 'INVALID_URL';
  end if;

  v_lic := public.proven_license(p_license_key, p_fingerprint);

  -- The key is already a practice's: the plain heartbeat. A practice from
  -- before this migration learns its licence here, so the same licence on
  -- another PC finds it instead of opening a second practice.
  select * into v_doc
  from doctors
  where remote_token <> '' and remote_token = v_token;

  if found then
    update doctors
    set remote_api_url = p_url,
        remote_seen_at = now(),
        license_key = case
          when doctors.license_key is null
               and v_lic.key is not null
               and not exists (select 1 from doctors o where o.license_key = v_lic.key)
          then v_lic.key
          else doctors.license_key
        end
    where id = v_doc.id;
    return 'linked';
  end if;

  if v_lic.key is null then
    raise exception 'UNKNOWN_KEY';
  end if;

  select * into v_doc
  from doctors
  where license_key = v_lic.key
  for update;

  if not found then
    insert into doctors (slug, full_name, remote_token, remote_api_url, remote_seen_at, license_key)
    values (
      'cabinet-' || substr(md5(v_lic.key), 1, 12),
      coalesce(nullif(btrim(v_lic.label), ''), 'Cabinet'),
      v_token, p_url, now(), v_lic.key
    );
    return 'created';
  end if;

  if not exists (select 1 from staff where doctor_id = v_doc.id) then
    update doctors
    set remote_token   = v_token,
        remote_api_url = p_url,
        remote_seen_at = now()
    where id = v_doc.id;
    return 'rebound';
  end if;

  return 'other_key';
end;
$$;

revoke all on function public.register_practice(text, text, text, text) from public;
grant execute on function public.register_practice(text, text, text, text) to anon, authenticated;
