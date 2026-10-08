-- Every practice gets its establishment in the annuaire.
--
-- The annuaire (`providers` / `practitioners`) was backfilled from `doctors`
-- once, in 20260921000000, and kept in step since by the mirror triggers —
-- which only UPDATE an establishment already linked by `legacy_doctor_id`.
-- Practices created later (now by the desktop app, register_practice) never
-- got one, so for them:
--
--   * the specialties picked in "Détails du médecin" were dropped:
--     set_doctor_specialties stores them on the establishment, found none,
--     and returned ok — the page then read back "Aucune spécialité";
--   * the practice never appeared in the Médecins listing, which searches
--     establishments, even once published.
--
-- This creates the missing establishment the way the original backfill did,
-- for existing practices now and for every new one from here on. After that
-- the existing mirrors keep it in step as the secretary edits.

create or replace function public.ensure_doctor_provider(p_doctor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d          public.doctors;
  v_slug     text;
  v_provider uuid;
  v_custom   text[];
begin
  select * into d from public.doctors where id = p_doctor;
  if not found
     or exists (select 1 from public.providers where legacy_doctor_id = d.id) then
    return;
  end if;

  -- The annuaire also holds imported establishments: never collide with one.
  v_slug := d.slug;
  if exists (select 1 from public.providers where slug = v_slug) then
    v_slug := d.slug || '-' || substr(replace(d.id::text, '-', ''), 1, 6);
  end if;

  insert into public.providers (
    kind, slug, name, bio, photo_url, address, city, phone, email,
    latitude, longitude, booking_mode, is_published,
    remote_api_url, remote_seen_at, source, legacy_doctor_id
  ) values (
    'medecin', v_slug,
    trim(coalesce(nullif(trim(d.title), ''), 'Dr') || ' ' || coalesce(d.full_name, '')),
    coalesce(d.bio, ''), coalesce(d.photo_url, ''), coalesce(d.address, ''),
    coalesce(d.city, ''), coalesce(d.phone, ''), coalesce(d.email, ''),
    d.latitude, d.longitude,
    -- Paired with a desktop app by construction: live slots.
    'agenda', coalesce(d.is_published, false),
    coalesce(d.remote_api_url, ''), d.remote_seen_at,
    'manuel', d.id
  )
  returning id into v_provider;

  insert into public.practitioners (
    provider_id, slug, title, full_name, bio, photo_url,
    booking_mode, remote_api_url, remote_seen_at, is_published, legacy_doctor_id
  ) values (
    v_provider, d.slug, coalesce(nullif(trim(d.title), ''), 'Dr'), coalesce(d.full_name, ''),
    coalesce(d.bio, ''), coalesce(d.photo_url, ''),
    'agenda', coalesce(d.remote_api_url, ''), d.remote_seen_at,
    coalesce(d.is_published, false), d.id
  );

  -- Hours and tariffs, by the same rules as their mirror triggers.
  insert into public.opening_hours (provider_id, weekday, opens_at, closes_at)
  select
    v_provider,
    (day_entry ->> 'day')::smallint,
    (range_entry ->> 0)::time,
    (range_entry ->> 1)::time
  from jsonb_array_elements(
    case when jsonb_typeof(d.hours) = 'array' then d.hours else '[]'::jsonb end
  ) as day_entry
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(day_entry -> 'ranges') = 'array'
         then day_entry -> 'ranges' else '[]'::jsonb end
  ) as range_entry
  where (day_entry ->> 'day')::smallint between 1 and 7
    and coalesce(range_entry ->> 0, '') <> ''
    and coalesce(range_entry ->> 1, '') <> ''
    and (range_entry ->> 1)::time > (range_entry ->> 0)::time;

  insert into public.services (provider_id, label, amount_millimes, note, sort_order)
  select
    v_provider,
    trim(t.value ->> 'label'),
    round(coalesce(nullif(t.value ->> 'amount', '')::numeric, 0) * 1000)::int,
    coalesce(t.value ->> 'note', ''),
    (t.ordinality * 10)::int
  from jsonb_array_elements(
    case when jsonb_typeof(d.tariffs) = 'array' then d.tariffs else '[]'::jsonb end
  ) with ordinality as t(value, ordinality)
  where coalesce(trim(t.value ->> 'label'), '') <> '';

  -- Specialties: set_doctor_specialties also writes them, as labels joined by
  -- " · ", onto doctors.specialty — the one copy that survived. Labels of the
  -- taxonomy become links again, anything else the custom entries it was.
  insert into public.provider_specialties (provider_id, specialty_id, practitioner_id)
  select distinct v_provider, s.id, null::uuid
  from unnest(string_to_array(coalesce(d.specialty, ''), ' · ')) as part
  join public.specialties s on lower(trim(part)) = lower(s.label)
  on conflict do nothing;

  select coalesce(array_agg(distinct left(trim(part), 60)), '{}')
    into v_custom
  from unnest(string_to_array(coalesce(d.specialty, ''), ' · ')) as part
  where trim(part) <> ''
    and not exists (select 1 from public.specialties s where lower(s.label) = lower(trim(part)));

  update public.providers set custom_specialties = v_custom where id = v_provider;
  perform public.refresh_provider_specialty_text(v_provider);
end;
$$;

revoke all on function public.ensure_doctor_provider(uuid) from public, anon, authenticated;

create or replace function public.doctors_ensure_provider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_doctor_provider(new.id);
  return new;
end;
$$;

drop trigger if exists doctors_ensure_provider on public.doctors;
create trigger doctors_ensure_provider
  after insert on public.doctors
  for each row
  execute function public.doctors_ensure_provider();

-- A title typed into the name showed as "Dr Dr Aziz": the title is already
-- printed in front of it everywhere. The settings form now strips it on save;
-- this cleans what was saved before. (The mirror carries it to an existing
-- establishment; the ones created below start from the clean name.)
update public.doctors
   set full_name = regexp_replace(full_name, '^\s*(dr\.?|docteur)\s+', '', 'i')
 where full_name ~* '^\s*(dr\.?|docteur)\s+\S';

-- The practices already missing one.
select public.ensure_doctor_provider(d.id)
from public.doctors d
where not exists (select 1 from public.providers p where p.legacy_doctor_id = d.id);

-- ─── Comptes: tell practices of one licence apart ───────────────────────────
-- Each PC on a licence is its own practice, and until its secretary fills it
-- in, each is named after the licence: two identical "Dr Aziz Bjaoui" rows.
-- The back-office now shows which licence and which computer (the hostname
-- recorded when that machine activated the licence) every practice runs on.

drop function if exists public.admin_list_doctors(text);

create function public.admin_list_doctors(p_admin_secret text)
returns table (
  id             uuid,
  slug           text,
  full_name      text,
  title          text,
  specialty      text,
  city           text,
  phone          text,
  email          text,
  is_published   boolean,
  paired         boolean,
  remote_seen_at timestamptz,
  staff_count    bigint,
  created_at     timestamptz,
  license_key    text,
  computer       text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    d.id, d.slug, d.full_name, d.title, d.specialty, d.city, d.phone, d.email,
    d.is_published, d.remote_token <> '', d.remote_seen_at,
    coalesce(s.cnt, 0), d.created_at,
    d.license_key,
    a.hostname
  from doctors d
  left join (
    select doctor_id, count(*) cnt from staff where doctor_id is not null group by doctor_id
  ) s on s.doctor_id = d.id
  left join license_activations a
    on a.license_key = d.license_key and a.machine_fingerprint = d.license_machine
  order by d.created_at desc;
end;
$$;

revoke all on function public.admin_list_doctors(text) from public;
grant execute on function public.admin_list_doctors(text) to anon;
