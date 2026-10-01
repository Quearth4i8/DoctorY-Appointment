-- Doctor absences: holidays, conferences, training, meetings…
--
-- The secretary records when the doctor will not be at the cabinet. While an
-- absence runs, the public agenda offers no slot, the profile says why, and
-- the request endpoint refuses that time — a patient is told before asking,
-- not called back to be told.
--
-- Absences live here, in Supabase, rather than in doctor.db: they are about
-- the public face of the agenda, and the secretary must be able to set one
-- while the cabinet PC is off.

create table if not exists public.doctor_absences (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.doctors (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  -- What patients see as the reason. Kept to a short fixed list: a free-text
  -- reason on a public page is an invitation to over-share.
  reason     text not null default 'conge'
               check (reason in ('conge', 'conference', 'formation', 'reunion', 'indisponible')),
  -- Optional line shown to patients, e.g. "Reprise des consultations le 21".
  note       text not null default '' check (length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

comment on table public.doctor_absences is
  'Periods the doctor is away. Staff manage them; the public sees only dates, reason and note via public_absences().';

create index if not exists doctor_absences_lookup_idx
  on public.doctor_absences (doctor_id, starts_at, ends_at);

alter table public.doctor_absences enable row level security;

-- Staff of that practice (or unbound staff, the single-practice case — the
-- same rule as appointment requests).
create or replace function public.can_manage_doctor(p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
     and (public.staff_doctor_id() is null or p_doctor_id = public.staff_doctor_id());
$$;

revoke all on function public.can_manage_doctor(uuid) from public, anon;
grant execute on function public.can_manage_doctor(uuid) to authenticated;

drop policy if exists "staff read absences" on public.doctor_absences;
create policy "staff read absences"
  on public.doctor_absences for select
  to authenticated
  using (public.can_manage_doctor(doctor_id));

drop policy if exists "staff add absences" on public.doctor_absences;
create policy "staff add absences"
  on public.doctor_absences for insert
  to authenticated
  with check (public.can_manage_doctor(doctor_id));

drop policy if exists "staff edit absences" on public.doctor_absences;
create policy "staff edit absences"
  on public.doctor_absences for update
  to authenticated
  using (public.can_manage_doctor(doctor_id))
  with check (public.can_manage_doctor(doctor_id));

drop policy if exists "staff delete absences" on public.doctor_absences;
create policy "staff delete absences"
  on public.doctor_absences for delete
  to authenticated
  using (public.can_manage_doctor(doctor_id));

revoke all on public.doctor_absences from anon;
grant select, insert, update, delete on public.doctor_absences to authenticated;

/**
 * What the public may know about absences: when, the reason code and the
 * patient-facing note — never who entered it. Published doctors only.
 */
create or replace function public.public_absences(
  p_doctor uuid,
  p_from   timestamptz,
  p_to     timestamptz
)
returns table (starts_at timestamptz, ends_at timestamptz, reason text, note text)
language sql
stable
security definer
set search_path = public
as $$
  select a.starts_at, a.ends_at, a.reason, a.note
  from public.doctor_absences a
  join public.doctors d on d.id = a.doctor_id
  where a.doctor_id = p_doctor
    and d.is_published
    and a.starts_at < p_to
    and a.ends_at > p_from
  order by a.starts_at;
$$;

revoke all on function public.public_absences(uuid, timestamptz, timestamptz) from public;
grant execute on function public.public_absences(uuid, timestamptz, timestamptz) to anon, authenticated;
