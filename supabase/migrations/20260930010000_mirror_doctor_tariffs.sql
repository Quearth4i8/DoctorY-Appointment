-- Keep a backfilled establishment's price list in step with the doctor's.
--
-- Same drift as opening hours (see 20260930000000_mirror_doctor_hours.sql):
-- the settings page saves tariffs to `doctors.tariffs` (jsonb, in dinars),
-- the public profile reads `services` rows (in millimes), and the marketplace
-- migration copied one into the other exactly once. A doctor who removed a
-- tariff kept seeing it on their public page.
--
-- Unlike hours, nothing else writes `services` for these establishments — the
-- admin editor only counts them — so the doctor's list simply owns it, down
-- to an empty list clearing the section.

create or replace function public.mirror_doctor_tariffs_to_provider()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.services s
  using public.providers p
  where p.legacy_doctor_id = new.id
    and s.provider_id = p.id;

  insert into public.services (provider_id, label, amount_millimes, note, sort_order)
  select
    p.id,
    trim(t.value ->> 'label'),
    round(coalesce(nullif(t.value ->> 'amount', '')::numeric, 0) * 1000)::int,
    coalesce(t.value ->> 'note', ''),
    (t.ordinality * 10)::int
  from public.providers p
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(new.tariffs) = 'array' then new.tariffs else '[]'::jsonb end
  ) with ordinality as t(value, ordinality)
  where p.legacy_doctor_id = new.id
    and coalesce(trim(t.value ->> 'label'), '') <> '';

  return new;
end;
$$;

comment on function public.mirror_doctor_tariffs_to_provider() is
  'Rewrites services of the provider backfilled from a doctors row whenever that doctor''s tariffs change.';

drop trigger if exists doctors_mirror_tariffs_to_provider on public.doctors;
create trigger doctors_mirror_tariffs_to_provider
  after update of tariffs on public.doctors
  for each row
  when (old.tariffs is distinct from new.tariffs)
  execute function public.mirror_doctor_tariffs_to_provider();

-- Catch up every linked establishment now, so tariffs changed before this
-- migration show up (or disappear) without the doctor having to save again.
delete from public.services s
using public.providers p
where p.legacy_doctor_id is not null
  and s.provider_id = p.id;

insert into public.services (provider_id, label, amount_millimes, note, sort_order)
select
  p.id,
  trim(t.value ->> 'label'),
  round(coalesce(nullif(t.value ->> 'amount', '')::numeric, 0) * 1000)::int,
  coalesce(t.value ->> 'note', ''),
  (t.ordinality * 10)::int
from public.doctors d
join public.providers p on p.legacy_doctor_id = d.id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.tariffs) = 'array' then d.tariffs else '[]'::jsonb end
) with ordinality as t(value, ordinality)
where coalesce(trim(t.value ->> 'label'), '') <> '';
