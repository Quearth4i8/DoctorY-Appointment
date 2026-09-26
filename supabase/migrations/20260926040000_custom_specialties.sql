-- Let a practice name a specialty the taxonomy does not have.
--
-- The curated list cannot cover everything, and a doctor whose actual practice
-- is missing from it should not be forced to pick the nearest wrong thing.
--
-- Custom entries deliberately do NOT become rows in `specialties`. That table
-- is a closed taxonomy: it drives the filter rail, the search suggestions and
-- the establishment form, and letting every practice append to it would turn
-- those into a list of one-off spellings within a month. They live on the
-- establishment instead, and reach search the same way the curated ones do —
-- through `specialties_text`.

alter table public.providers
  add column if not exists custom_specialties text[] not null default '{}';

comment on column public.providers.custom_specialties is
  'Free-text specialties this practice added itself. Searchable, but never part of the taxonomy.';

-- ─── Fold them into search alongside the curated ones ────────────────────────

create or replace function public.refresh_provider_specialty_text(p_provider uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.providers p
     set specialties_text = trim(
       coalesce(
         (
           select string_agg(
                    s.label || ' ' || coalesce(array_to_string(s.synonyms, ' '), ''),
                    ' '
                  )
             from public.provider_specialties ps
             join public.specialties s on s.id = ps.specialty_id
            where ps.provider_id = p_provider
         ),
         ''
       )
       || ' ' ||
       coalesce(array_to_string(p.custom_specialties, ' '), '')
     )
   where p.id = p_provider;
end $$;

-- ─── Read and write both halves ──────────────────────────────────────────────
-- Dropped rather than replaced: both signatures change, and leaving the old
-- ones in place would give PostgREST two candidates to choose between.

drop function if exists public.get_doctor_specialties();
drop function if exists public.set_doctor_specialties(text[]);

/** The practice's curated slugs and its own free-text entries. */
create or replace function public.get_doctor_specialties()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_doctor   uuid;
  v_provider uuid;
  v_slugs    text[];
  v_custom   text[];
begin
  if not public.is_staff() then
    return jsonb_build_object('slugs', '[]'::jsonb, 'custom', '[]'::jsonb);
  end if;

  v_doctor := public.staff_doctor_id();
  if v_doctor is null then
    select id into v_doctor from public.doctors order by created_at limit 1;
  end if;

  if v_doctor is not null then
    select id, custom_specialties
      into v_provider, v_custom
      from public.providers
     where legacy_doctor_id = v_doctor;
  end if;

  if v_provider is not null then
    select array_agg(s.slug order by s.sort_order)
      into v_slugs
      from public.provider_specialties ps
      join public.specialties s on s.id = ps.specialty_id
     where ps.provider_id = v_provider
       and ps.practitioner_id is null;
  end if;

  return jsonb_build_object(
    'slugs',  to_jsonb(coalesce(v_slugs, '{}')),
    'custom', to_jsonb(coalesce(v_custom, '{}'))
  );
end $$;

create or replace function public.set_doctor_specialties(
  p_slugs  text[],
  p_custom text[] default '{}'
)
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
  v_custom   text[];
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

  -- Trim, drop blanks and duplicates, and cap each entry's length so the
  -- free-text side cannot be used as a description field or an ad slot.
  select array_agg(distinct left(trim(c), 60))
    into v_custom
    from unnest(coalesce(p_custom, '{}')) as c
   where trim(c) <> '';

  v_custom := coalesce(v_custom, '{}');

  -- The cap counts both halves: eight is what a practice may claim in total,
  -- however it spells them.
  if coalesce(array_length(v_slugs, 1), 0)
     + coalesce(array_length(v_custom, 1), 0) > 8 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  -- Unknown slugs are dropped rather than rejected: the taxonomy is closed and
  -- may lose an entry, and that should not wedge somebody's settings page.
  select array_agg(s.slug), string_agg(s.label, ' · ' order by s.sort_order)
    into v_slugs, v_labels
    from public.specialties s
   where s.slug = any(v_slugs);

  v_slugs := coalesce(v_slugs, '{}');

  -- The free-text summary the older /medecins profile renders. Custom entries
  -- belong in it too, or the profile would describe the practice differently
  -- from the annuaire.
  update public.doctors
     set specialty = trim(both ' ·' from
           concat_ws(' · ', nullif(coalesce(v_labels, ''), ''),
                            nullif(array_to_string(v_custom, ' · '), '')))
   where id = v_doctor;

  select id into v_provider
    from public.providers
   where legacy_doctor_id = v_doctor;

  if v_provider is not null then
    -- Written before the join rows, so the trigger below picks it up.
    update public.providers
       set custom_specialties = v_custom
     where id = v_provider;

    delete from public.provider_specialties
     where provider_id = v_provider
       and practitioner_id is null;

    insert into public.provider_specialties (provider_id, specialty_id, practitioner_id)
    select v_provider, s.id, null
      from public.specialties s
     where s.slug = any(v_slugs)
    on conflict do nothing;

    -- A practice whose only specialties are custom ones writes no join rows at
    -- all, so the trigger never fires. Recompute explicitly.
    perform public.refresh_provider_specialty_text(v_provider);
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.get_doctor_specialties() from public;
revoke all on function public.set_doctor_specialties(text[], text[]) from public;
grant execute on function public.get_doctor_specialties() to authenticated;
grant execute on function public.set_doctor_specialties(text[], text[]) to authenticated;

-- Backfill so existing rows include their (currently empty) custom entries.
update public.providers p
   set specialties_text = trim(
     coalesce(
       (
         select string_agg(
                  s.label || ' ' || coalesce(array_to_string(s.synonyms, ' '), ''),
                  ' '
                )
           from public.provider_specialties ps
           join public.specialties s on s.id = ps.specialty_id
          where ps.provider_id = p.id
       ),
       ''
     )
     || ' ' ||
     coalesce(array_to_string(p.custom_specialties, ' '), '')
   );
