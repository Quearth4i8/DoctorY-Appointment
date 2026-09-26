-- Let a practice declare its own specialties, and make that declarable at all.
--
-- Specialty search reads `provider_specialties`. Nothing in the application
-- has ever written to it, so every specialty filter matched nothing no matter
-- how full the taxonomy got — a doctor could not say "diabétologie" anywhere,
-- and a patient searching for one found an empty page.

-- ─── First, the reason it could not be written ───────────────────────────────
--
-- The table documents a null `practitioner_id` as "the establishment offers
-- this", and carries a partial unique index built specifically for that case:
--
--     create unique index provider_specialties_house_idx
--       on public.provider_specialties (provider_id, specialty_id)
--       where practitioner_id is null;
--
-- But the table also declares `primary key (provider_id, specialty_id,
-- practitioner_id)`, and a PRIMARY KEY makes every column in it NOT NULL.
-- So the house row the comment describes could never be inserted, and that
-- index has never matched anything. Dropping the primary key in favour of two
-- unique indexes keeps every uniqueness guarantee the table meant to have and
-- allows the row it was designed around.

alter table public.provider_specialties
  drop constraint if exists provider_specialties_pkey;

-- Dropping the constraint does not necessarily drop the NOT NULL it implied.
alter table public.provider_specialties
  alter column practitioner_id drop not null;

-- The house case keeps provider_specialties_house_idx, created with the table.
-- This is its twin for rows that do name a practitioner.
create unique index if not exists provider_specialties_practitioner_idx
  on public.provider_specialties (provider_id, specialty_id, practitioner_id)
  where practitioner_id is not null;

-- ─── Then, the way a practice sets them ──────────────────────────────────────

/*
 * Replace the specialties this practice offers.
 *
 * Whole-list replace rather than add/remove calls: the settings form knows the
 * complete set the user is looking at, and two round trips per checkbox is how
 * a half-saved list happens.
 *
 * security definer because `provider_specialties` is not writable by staff
 * directly — the establishment row is keyed to the practice by
 * `legacy_doctor_id`, and resolving that is exactly the check that must not
 * happen in the browser.
 *
 * Which doctor gets edited mirrors getDoctorForStaff() in the application:
 * bound staff edit their own, unbound staff edit the practice's oldest
 * profile. If those two ever disagree the settings page would show one
 * profile and save to another, so they are deliberately the same rule.
 */
create or replace function public.set_doctor_specialties(p_slugs text[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doctor   uuid;
  v_provider uuid;
  v_labels   text;
  v_slugs    text[] := coalesce(p_slugs, '{}');
begin
  if not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_doctor := public.staff_doctor_id();
  if v_doctor is null then
    select id into v_doctor from public.doctors order by created_at limit 1;
  end if;

  if v_doctor is null then
    return jsonb_build_object('ok', false, 'error', 'no_doctor');
  end if;

  -- A listing that claims everything is as useless to a patient as one that
  -- claims nothing, and it is the obvious way to game specialty search.
  if array_length(v_slugs, 1) > 8 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  -- Unknown slugs are dropped rather than rejected: the taxonomy is closed and
  -- may lose an entry, and that should not wedge somebody's settings page.
  select array_agg(s.slug), string_agg(s.label, ' · ' order by s.sort_order)
    into v_slugs, v_labels
    from public.specialties s
   where s.slug = any(v_slugs);

  v_slugs := coalesce(v_slugs, '{}');

  -- The free-text summary the older /medecins profile still renders, and what
  -- mirror_doctor_to_provider carries across. Kept in step so the two never
  -- describe the same practice differently.
  update public.doctors
     set specialty = coalesce(v_labels, '')
   where id = v_doctor;

  select id into v_provider
    from public.providers
   where legacy_doctor_id = v_doctor;

  if v_provider is not null then
    delete from public.provider_specialties
     where provider_id = v_provider
       and practitioner_id is null;

    insert into public.provider_specialties (provider_id, specialty_id, practitioner_id)
    select v_provider, s.id, null
      from public.specialties s
     where s.slug = any(v_slugs)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'labels', coalesce(v_labels, ''),
    'count', coalesce(array_length(v_slugs, 1), 0)
  );
end $$;

revoke all on function public.set_doctor_specialties(text[]) from public;
grant execute on function public.set_doctor_specialties(text[]) to authenticated;

/*
 * What this practice currently offers, for the settings form to check boxes
 * from. Reads through the same binding rule as the setter, so the form can
 * never be populated from one profile and saved to another.
 */
create or replace function public.get_doctor_specialties()
returns text[]
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_doctor   uuid;
  v_provider uuid;
  v_slugs    text[];
begin
  if not public.is_staff() then
    return '{}';
  end if;

  v_doctor := public.staff_doctor_id();
  if v_doctor is null then
    select id into v_doctor from public.doctors order by created_at limit 1;
  end if;
  if v_doctor is null then
    return '{}';
  end if;

  select id into v_provider
    from public.providers
   where legacy_doctor_id = v_doctor;

  if v_provider is null then
    return '{}';
  end if;

  select array_agg(s.slug order by s.sort_order)
    into v_slugs
    from public.provider_specialties ps
    join public.specialties s on s.id = ps.specialty_id
   where ps.provider_id = v_provider
     and ps.practitioner_id is null;

  return coalesce(v_slugs, '{}');
end $$;

revoke all on function public.get_doctor_specialties() from public;
grant execute on function public.get_doctor_specialties() to authenticated;
