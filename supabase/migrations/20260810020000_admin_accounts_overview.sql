-- Admin visibility into doctors, staff, and app-wide activity — the
-- counterpart to the license admin RPCs, reusing the same
-- _check_admin_secret() gate (see 20260810010000_license_admin.sql).
-- No service-role key involved: every query runs inside a SECURITY DEFINER
-- function scoped to exactly what it returns.

-- ─── doctors ──────────────────────────────────────────────────────────────────

create or replace function public.admin_list_doctors(p_admin_secret text)
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
  created_at     timestamptz
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
    coalesce(s.cnt, 0), d.created_at
  from doctors d
  left join (
    select doctor_id, count(*) cnt from staff where doctor_id is not null group by doctor_id
  ) s on s.doctor_id = d.id
  order by d.created_at desc;
end;
$$;

revoke all on function public.admin_list_doctors(text) from public;
grant execute on function public.admin_list_doctors(text) to anon;

-- ─── staff ────────────────────────────────────────────────────────────────────

-- staff has no email column of its own (it lives on auth.users); a
-- SECURITY DEFINER function is exactly what lets this join reach it without
-- granting anon any access to the auth schema itself.
create or replace function public.admin_list_staff(p_admin_secret text)
returns table (
  user_id     uuid,
  full_name   text,
  email       text,
  role        text,
  doctor_id   uuid,
  doctor_name text,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select s.user_id, s.full_name, au.email::text, s.role, s.doctor_id, d.full_name, s.created_at
  from staff s
  join auth.users au on au.id = s.user_id
  left join doctors d on d.id = s.doctor_id
  order by s.created_at desc;
end;
$$;

revoke all on function public.admin_list_staff(text) from public;
grant execute on function public.admin_list_staff(text) to anon;

create or replace function public.admin_reassign_staff(
  p_admin_secret text,
  p_user_id      uuid,
  p_doctor_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  update staff set doctor_id = p_doctor_id where user_id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.admin_reassign_staff(text, uuid, uuid) from public;
grant execute on function public.admin_reassign_staff(text, uuid, uuid) to anon;

-- Removes app access (the `staff` row) without touching the underlying
-- Supabase Auth account — reversible by re-linking, and doesn't destroy
-- their login identity or email history.
create or replace function public.admin_revoke_staff(p_admin_secret text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  delete from staff where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_revoke_staff(text, uuid) from public;
grant execute on function public.admin_revoke_staff(text, uuid) to anon;

-- ─── app overview ─────────────────────────────────────────────────────────────

create or replace function public.admin_app_stats(p_admin_secret text)
returns table (
  doctors_total          bigint,
  doctors_published      bigint,
  staff_total            bigint,
  staff_secretaries      bigint,
  requests_total         bigint,
  requests_pending       bigint,
  requests_accepted      bigint,
  requests_refused       bigint,
  appointments_total     bigint,
  appointments_upcoming  bigint,
  patients_total         bigint,
  patients_active        bigint,
  license_keys_total     bigint,
  license_machines_total bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    (select count(*) from doctors),
    (select count(*) from doctors where is_published),
    (select count(*) from staff),
    (select count(*) from staff where role = 'secretary'),
    (select count(*) from appointment_requests),
    (select count(*) from appointment_requests where status = 'en_attente'),
    (select count(*) from appointment_requests where status = 'accepte'),
    (select count(*) from appointment_requests where status = 'refuse'),
    (select count(*) from appointments),
    (select count(*) from appointments where status = 'a_venir'),
    (select count(*) from patients),
    (select count(*) from patients where archived_at is null),
    (select count(*) from license_keys),
    (select count(*) from license_activations);
end;
$$;

revoke all on function public.admin_app_stats(text) from public;
grant execute on function public.admin_app_stats(text) to anon;

create or replace function public.admin_requests_over_time(p_admin_secret text)
returns table (day date, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select created_at::date, count(*)
  from appointment_requests
  where created_at >= now() - interval '60 days'
  group by created_at::date
  order by created_at::date;
end;
$$;

revoke all on function public.admin_requests_over_time(text) from public;
grant execute on function public.admin_requests_over_time(text) to anon;
