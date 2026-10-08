-- One practice per licensed MACHINE, not per licence.
--
-- 20261008000000 gave each licence a single practice. But every installation
-- keeps its own doctor.db: two PCs on the same licence hold two separate sets
-- of patients, so they are two practices. The second PC's key was answered
-- 'other_key' once the first had a secretary, and its signup kept reading
-- "Cette clé de liaison n'est pas reconnue".
--
-- A practice now belongs to (licence, machine). The licence's own activation
-- limit (max_activations) still caps how many practices it can open, since a
-- machine must be activated on it before it can register.

alter table public.doctors
  add column if not exists license_machine text;

comment on column public.doctors.license_machine is
  'Fingerprint of the licensed machine this practice runs on. Set by register_practice().';

drop index if exists public.doctors_license_key_unique;
create unique index if not exists doctors_license_machine_unique
  on public.doctors (license_key, license_machine)
  where license_key is not null;

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
  v_fp    text := btrim(coalesce(p_fingerprint, ''));
  v_lic   public.license_keys;
  v_doc   public.doctors;
begin
  if length(v_token) < 16 then
    raise exception 'INVALID_KEY';
  end if;
  if coalesce(p_url, '') !~ '^https://[a-zA-Z0-9.-]+' then
    raise exception 'INVALID_URL';
  end if;

  v_lic := public.proven_license(p_license_key, v_fp);

  -- The key is already a practice's: the plain heartbeat. A practice that
  -- doesn't know its licence or machine yet learns them here.
  select * into v_doc
  from doctors
  where remote_token <> '' and remote_token = v_token;

  if found then
    update doctors
    set remote_api_url = p_url,
        remote_seen_at = now()
    where id = v_doc.id;

    if v_lic.key is not null
       and (v_doc.license_key is null or v_doc.license_machine is null)
       and not exists (
         select 1 from doctors o
         where o.id <> v_doc.id and o.license_key = v_lic.key and o.license_machine = v_fp
       )
    then
      update doctors
      set license_key = v_lic.key, license_machine = v_fp
      where id = v_doc.id;
    end if;
    return 'linked';
  end if;

  if v_lic.key is null then
    raise exception 'UNKNOWN_KEY';
  end if;

  select * into v_doc
  from doctors
  where license_key = v_lic.key and license_machine = v_fp
  for update;

  if not found then
    insert into doctors (slug, full_name, remote_token, remote_api_url, remote_seen_at, license_key, license_machine)
    values (
      'cabinet-' || substr(md5(v_lic.key || ':' || v_fp), 1, 12),
      coalesce(nullif(btrim(v_lic.label), ''), 'Cabinet'),
      v_token, p_url, now(), v_lic.key, v_fp
    );
    return 'created';
  end if;

  -- This machine reinstalled (a new key). Before anyone signed up, the
  -- practice simply follows; afterwards its secretary relinks it from
  -- Paramètres on the website.
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
