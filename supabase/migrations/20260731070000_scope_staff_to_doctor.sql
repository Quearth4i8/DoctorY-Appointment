-- Bind each staff member to a doctor, and scope what they can see to it.
--
-- Until now every policy on appointment_requests was `using (is_staff())`, so
-- any secretary could read every doctor's requests. Filtering in the API route
-- would not have fixed that: the browser holds the anon key and a real session,
-- so it can query PostgREST directly. The boundary has to be the policy.
--
-- An unbound staff member (doctor_id null) still sees everything — that is the
-- single-practice case, and avoids locking anyone out the moment this runs.

alter table public.staff
  add column if not exists doctor_id uuid references public.doctors (id) on delete set null;

comment on column public.staff.doctor_id is
  'Which doctor this person works for. Null = sees every doctor (single practice).';

-- security definer so policies can read it without recursing through staff RLS.
create or replace function public.staff_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select doctor_id from public.staff where user_id = auth.uid();
$$;

-- ─── appointment_requests ────────────────────────────────────────────────────

-- True when the signed-in staff member may touch this request.
create or replace function public.can_access_request(p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
     and (
       public.staff_doctor_id() is null   -- unbound staff: whole practice
       or p_doctor_id is null             -- request not tied to a doctor
       or p_doctor_id = public.staff_doctor_id()
     );
$$;

drop policy if exists "staff read requests" on public.appointment_requests;
drop policy if exists "staff read own doctor requests" on public.appointment_requests;
create policy "staff read own doctor requests"
  on public.appointment_requests for select
  to authenticated
  using (public.can_access_request(doctor_id));

drop policy if exists "staff review requests" on public.appointment_requests;
drop policy if exists "staff review own doctor requests" on public.appointment_requests;
create policy "staff review own doctor requests"
  on public.appointment_requests for update
  to authenticated
  using (public.can_access_request(doctor_id))
  with check (public.can_access_request(doctor_id));

drop policy if exists "staff delete requests" on public.appointment_requests;
drop policy if exists "staff delete own doctor requests" on public.appointment_requests;
create policy "staff delete own doctor requests"
  on public.appointment_requests for delete
  to authenticated
  using (public.can_access_request(doctor_id));

-- ─── doctors ─────────────────────────────────────────────────────────────────
-- Same reasoning: a secretary must not be able to edit another doctor's public
-- page, tariffs or hours.

drop policy if exists "staff write doctors" on public.doctors;
create policy "staff write own doctor"
  on public.doctors for all
  to authenticated
  using (
    public.is_staff()
    and (public.staff_doctor_id() is null or id = public.staff_doctor_id())
  )
  with check (
    public.is_staff()
    and (public.staff_doctor_id() is null or id = public.staff_doctor_id())
  );

-- ─── seed ────────────────────────────────────────────────────────────────────
-- One doctor today: bind every existing staff member to them, so the scoping is
-- live immediately rather than silently inert. With several doctors this does
-- nothing and each row must be set deliberately:
--
--   update public.staff set doctor_id = (select id from public.doctors where slug = 'xxx')
--   where user_id = '<uuid>';

update public.staff
set doctor_id = (select id from public.doctors limit 1)
where doctor_id is null
  and (select count(*) from public.doctors) = 1;
