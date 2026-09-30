-- Keep a backfilled establishment's opening hours in step with the doctor's.
--
-- The settings page saves hours to `doctors.hours` (jsonb). The public agenda
-- and the annuaire read `opening_hours` rows, which the marketplace migration
-- filled from that jsonb once and nothing has touched since — so a doctor who
-- changed their hours saw the change in their settings and nowhere else: the
-- booking grid kept offering the old slots.
--
-- mirror_doctor_to_provider() left hours out on purpose, because the admin
-- establishment editor can set them too. This keeps that editor meaningful:
-- the mirror fires only when the doctor's hours actually change, so an admin
-- edit stands until the doctor next saves different hours of their own.

create or replace function public.mirror_doctor_hours_to_provider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.opening_hours oh
  using public.providers p
  where p.legacy_doctor_id = new.id
    and oh.provider_id = p.id;

  insert into public.opening_hours (provider_id, weekday, opens_at, closes_at)
  select
    p.id,
    (day_entry ->> 'day')::smallint,
    (range_entry ->> 0)::time,
    (range_entry ->> 1)::time
  from public.providers p
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(new.hours) = 'array' then new.hours else '[]'::jsonb end
  ) as day_entry
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(day_entry -> 'ranges') = 'array'
         then day_entry -> 'ranges' else '[]'::jsonb end
  ) as range_entry
  where p.legacy_doctor_id = new.id
    and (day_entry ->> 'day')::smallint between 1 and 7
    and coalesce(range_entry ->> 0, '') <> ''
    and coalesce(range_entry ->> 1, '') <> ''
    -- A half-typed or inverted range would violate the table's check and
    -- fail the doctor's whole save; skip it instead, like the admin editor.
    and (range_entry ->> 1)::time > (range_entry ->> 0)::time;

  return new;
end;
$$;

comment on function public.mirror_doctor_hours_to_provider() is
  'Rewrites opening_hours of the provider backfilled from a doctors row whenever that doctor''s hours change.';

drop trigger if exists doctors_mirror_hours_to_provider on public.doctors;
create trigger doctors_mirror_hours_to_provider
  after update of hours on public.doctors
  for each row
  when (old.hours is distinct from new.hours)
  execute function public.mirror_doctor_hours_to_provider();

-- Catch up every linked establishment now, so hours saved before this
-- migration show up without the doctor having to save again. Only where the
-- doctor has hours at all: one who never filled them in must not wipe hours
-- an admin set on the establishment by hand.
delete from public.opening_hours oh
using public.providers p, public.doctors d
where p.legacy_doctor_id = d.id
  and oh.provider_id = p.id
  and jsonb_typeof(d.hours) = 'array'
  and jsonb_array_length(d.hours) > 0;

insert into public.opening_hours (provider_id, weekday, opens_at, closes_at)
select
  p.id,
  (day_entry ->> 'day')::smallint,
  (range_entry ->> 0)::time,
  (range_entry ->> 1)::time
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
cross join lateral jsonb_array_elements(d.hours) as day_entry
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(day_entry -> 'ranges') = 'array'
       then day_entry -> 'ranges' else '[]'::jsonb end
) as range_entry
where jsonb_typeof(d.hours) = 'array'
  and (day_entry ->> 'day')::smallint between 1 and 7
  and coalesce(range_entry ->> 0, '') <> ''
  and coalesce(range_entry ->> 1, '') <> ''
  and (range_entry ->> 1)::time > (range_entry ->> 0)::time;
