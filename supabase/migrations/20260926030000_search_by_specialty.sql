-- Make a specialty findable from the search box.
--
-- Attaching specialties to an establishment was not enough on its own:
-- `providers.search_text` is a generated column built from name, legal_name,
-- city, governorate and address, and a generated column cannot reach into
-- another table. So a practice could carry "Diabétologie" in
-- provider_specialties and still not be returned by anyone typing it.
--
-- The fix is a plain column that a trigger keeps in step — specialties_text —
-- which the generated column is then free to concatenate like any other field.
-- Synonyms go in too, so "diabéto", "diabetologue" and the Arabic label all
-- reach the same practice as the full French label does.

-- ─── Two specialties the first pass missed ───────────────────────────────────
-- Slugs deliberately identical to those in the desktop app's specialtyMeta.ts
-- (diabetologie, sexologie, obesite, nutrition), so one vocabulary covers both.

insert into public.specialties (slug, label, synonyms, kinds, sort_order) values
  ('sexologie', 'Sexologie', array['sexologue','sexotherapie'],                      array['medecin','clinique']::public.provider_kind[], 630),
  ('obesite',   'Obésité',   array['obesologue','surpoids','bariatrique','السمنة'],  array['medecin','clinique','hopital']::public.provider_kind[], 640)
on conflict (slug) do nothing;

-- ─── The searchable text ─────────────────────────────────────────────────────

alter table public.providers
  add column if not exists specialties_text text not null default '';

comment on column public.providers.specialties_text is
  'Labels + synonyms of this establishment''s specialties, folded into search_text by trigger.';

create or replace function public.refresh_provider_specialty_text(p_provider uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.providers p
     set specialties_text = coalesce(
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
   where p.id = p_provider;
end $$;

create or replace function public.provider_specialties_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Same shape as the ratings trigger, and for the same reason: PL/pgSQL never
  -- assigns NEW on a DELETE, so each side is reached only when it exists.
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_provider_specialty_text(old.provider_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_provider_specialty_text(new.provider_id);
  end if;

  return null;
end $$;

drop trigger if exists provider_specialties_touch on public.provider_specialties;
create trigger provider_specialties_touch
  after insert or update or delete on public.provider_specialties
  for each row execute function public.provider_specialties_touch();

-- Renaming a specialty, or giving it a new synonym, must reach every practice
-- that already claims it — otherwise the taxonomy and the search index drift.
create or replace function public.specialties_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider uuid;
begin
  for v_provider in
    select distinct provider_id
      from public.provider_specialties
     where specialty_id = new.id
  loop
    perform public.refresh_provider_specialty_text(v_provider);
  end loop;

  return null;
end $$;

drop trigger if exists specialties_touch on public.specialties;
create trigger specialties_touch
  after update of label, synonyms on public.specialties
  for each row execute function public.specialties_touch();

-- Backfill before the generated column starts reading it.
update public.providers p
   set specialties_text = coalesce(agg.txt, '')
  from (
    select ps.provider_id,
           string_agg(
             s.label || ' ' || coalesce(array_to_string(s.synonyms, ' '), ''),
             ' '
           ) as txt
      from public.provider_specialties ps
      join public.specialties s on s.id = ps.specialty_id
     group by ps.provider_id
  ) as agg
 where p.id = agg.provider_id;

-- ─── Fold it into search ─────────────────────────────────────────────────────
-- Dropping the generated column takes its GIN index with it; both come back
-- below. Queries go on using `search_text` exactly as before.

alter table public.providers drop column if exists search_text;

alter table public.providers
  add column search_text text
  generated always as (
    coalesce(name, '') || ' ' ||
    coalesce(legal_name, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(governorate, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(specialties_text, '')
  ) stored;

create index if not exists providers_search_trgm_idx
  on public.providers using gin (search_text gin_trgm_ops);
