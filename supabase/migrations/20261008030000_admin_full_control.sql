-- The back-office can delete what it lists: any login, any practice, any
-- establishment of the annuaire — and see every login, including the ones no
-- practice holds (an abandoned signup, a secretary whose practice was removed).
--
-- Same gate as every admin RPC: _check_admin_secret(), callable by anon only
-- with the operator's secret, never with a service-role key in the app.

-- ─── every login ─────────────────────────────────────────────────────────────

create or replace function public.admin_list_users(p_admin_secret text)
returns table (
  user_id         uuid,
  email           text,
  full_name       text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  confirmed       boolean,
  role            text,
  doctor_id       uuid,
  doctor_name     text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    au.id,
    au.email::text,
    coalesce(nullif(s.full_name, ''), au.raw_user_meta_data ->> 'full_name', '')::text,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at is not null,
    s.role,
    s.doctor_id,
    d.full_name
  from auth.users au
  left join staff s on s.user_id = au.id
  left join doctors d on d.id = s.doctor_id
  order by au.created_at desc;
end;
$$;

revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to anon;

/**
 * Deletes a login for good. Her staff row goes with it (staff.user_id cascades),
 * and what she reviewed or created keeps its row with the author cleared.
 */
create or replace function public.admin_delete_user(p_admin_secret text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(text, uuid) from public;
grant execute on function public.admin_delete_user(text, uuid) to anon;

-- ─── a practice ──────────────────────────────────────────────────────────────

/**
 * Deletes a practice and everything the website holds for it: its patients,
 * appointments and absences (they cascade), its appointment requests and its
 * establishment in the annuaire (they would otherwise be left behind), and
 * the logins of its staff.
 *
 * The staff go too because a staff member with no practice reads as "the
 * whole practice" in every policy (staff_doctor_id() is null) — detaching
 * them would hand them every other practice instead.
 *
 * Nothing on the doctor's PC is touched. If his app is still running with a
 * licence, it registers a fresh, empty practice on its next heartbeat.
 */
create or replace function public.admin_delete_doctor(p_admin_secret text, p_doctor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  delete from auth.users
  where id in (select user_id from staff where doctor_id = p_doctor_id);

  delete from appointment_requests where doctor_id = p_doctor_id;
  delete from providers where legacy_doctor_id = p_doctor_id;
  delete from doctors where id = p_doctor_id;
end;
$$;

revoke all on function public.admin_delete_doctor(text, uuid) from public;
grant execute on function public.admin_delete_doctor(text, uuid) to anon;

-- ─── an establishment ────────────────────────────────────────────────────────

/**
 * Deletes an establishment of the annuaire with everything hanging off it
 * (hours, services, specialties, practitioners, ratings, claims — all cascade).
 * A practice it was mirrored from stays: delete that from Comptes.
 */
create or replace function public.admin_delete_provider(p_admin_secret text, p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  delete from providers where id = p_provider_id;
end;
$$;

revoke all on function public.admin_delete_provider(text, uuid) from public;
grant execute on function public.admin_delete_provider(text, uuid) to anon;
