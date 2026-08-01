-- Pasting another doctor's key must MOVE the secretary to that doctor.
--
-- It did not. link_doctor_endpoint() read her current practice and overwrote
-- *its* token with the key she pasted, so she stayed bound to the same doctor
-- and kept seeing his demandes — while his row now pointed at somebody else's
-- machine. Signup already did the right thing (claim_staff_with_key binds
-- staff.doctor_id from the key); only the relink path did not.
--
-- Also closes a leak that has been there since doctor_id was added: a request
-- with a null doctor_id was visible to EVERY secretary in the project, and so
-- was every request once a staff row had no doctor_id of its own. With one
-- practice that was invisible. With several it hands one cabinet's patient
-- names and phone numbers to another cabinet's secretary.

-- ─── 1. nothing may be unattributed any more ─────────────────────────────────

-- Requests that predate the doctor_id column belong to the practice that was
-- the only one at the time.
update public.appointment_requests
set doctor_id = (select id from public.doctors order by created_at limit 1)
where doctor_id is null;

-- Same for staff, but ONLY when there is exactly one practice — with several,
-- guessing which one she works for would be worse than making her relink.
update public.staff
set doctor_id = (select id from public.doctors order by created_at limit 1)
where doctor_id is null
  and (select count(*) from public.doctors) = 1;

/*
 * Who a staff member may see.
 *
 * No null escape hatches left: a request always belongs to a practice, and a
 * staff member is always resolved to one — her own if bound, otherwise the
 * oldest, which is the single-practice case and matches resolveStaffDoctorId()
 * in the web app exactly.
 */
create or replace function public.can_access_request(p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
     and p_doctor_id = coalesce(
           public.staff_doctor_id(),
           (select id from public.doctors order by created_at limit 1)
         );
$$;

-- ─── 2. relinking moves her ──────────────────────────────────────────────────

-- Return type changes, so the old one has to go first.
drop function if exists public.link_doctor_endpoint(text);

/**
 * Points this secretary's account at a practice, using the doctor's key.
 *
 * Two cases, and which one applies depends on whether anybody already holds the
 * key:
 *
 *   'rebound'    the key belongs to a practice → she is moved to it. Her old
 *                practice is left completely alone; its key still works, and
 *                its agenda and patients are untouched.
 *
 *   'registered' nobody holds the key → it is a fresh installation of the app
 *                for the practice she already works for (a reinstall, or a new
 *                PC). The key is attached there and the stored address cleared,
 *                so the app re-registers itself.
 *
 * Returning which happened lets the UI say something true instead of guessing.
 */
create or replace function public.link_doctor_endpoint(p_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_key     text := btrim(coalesce(p_key, ''));
  v_owner   uuid;
  v_current uuid := public.staff_doctor_id();
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;

  if length(v_key) < 16 then
    raise exception 'INVALID_KEY';
  end if;

  select id into v_owner
  from doctors
  where remote_token <> '' and remote_token = v_key;

  if v_owner is not null then
    update staff set doctor_id = v_owner where user_id = v_uid;
    return 'rebound';
  end if;

  -- Unknown key: treat it as this practice's app announcing a new install.
  if v_current is null then
    select id into v_current from doctors order by created_at limit 1;
  end if;
  if v_current is null then
    raise exception 'NO_DOCTOR';
  end if;

  update doctors
  set remote_token   = v_key,
      remote_api_url = '',     -- forget the old address; the app re-registers
      remote_seen_at = null
  where id = v_current;

  -- She may have had no practice at all until now.
  update staff set doctor_id = v_current where user_id = v_uid;

  return 'registered';
end;
$$;

revoke all on function public.link_doctor_endpoint(text) from public, anon;
grant execute on function public.link_doctor_endpoint(text) to authenticated;
