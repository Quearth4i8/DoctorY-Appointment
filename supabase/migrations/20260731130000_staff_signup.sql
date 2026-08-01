-- Secretary self-registration, using the doctor's pairing key.
--
-- Until now a staff account meant creating an auth user in the dashboard and
-- inserting a `staff` row by hand. That does not scale past one practice, and
-- it puts you in the middle of every hire.
--
-- The key already identifies a practice, so it can also say which practice a
-- new secretary belongs to. She signs up, enters the key her doctor gave her,
-- and this binds her.
--
-- SECURITY. Two things follow from this and both are deliberate:
--
--   * Supabase sign-ups must be enabled, so anyone can create an *auth* user.
--     That alone grants nothing: every protected route checks membership of
--     `staff`, so an account without a row here sees nothing at all.
--   * Possession of the key becomes enough to join a practice. That is already
--     true of the API it unlocks, so it is not a new class of exposure — but it
--     does mean the key is a password, not a convenience code. A doctor who
--     leaks it should generate a new one.

create or replace function public.claim_staff_with_key(
  p_key       text,
  p_full_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_key    text := btrim(coalesce(p_key, ''));
  v_doctor uuid;
begin
  if v_uid is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  -- Already staff: nothing to claim. Prevents someone re-pointing an existing
  -- account at another practice by entering a key they happened to obtain.
  if exists (select 1 from staff where user_id = v_uid) then
    raise exception 'ALREADY_STAFF';
  end if;

  select id into v_doctor
  from doctors
  where remote_token <> '' and remote_token = v_key;

  if v_doctor is null then
    raise exception 'INVALID_KEY';
  end if;

  insert into staff (user_id, role, full_name, doctor_id)
  values (v_uid, 'secretary', left(btrim(coalesce(p_full_name, '')), 80), v_doctor);
end;
$$;

revoke all on function public.claim_staff_with_key(text, text) from public;
grant execute on function public.claim_staff_with_key(text, text) to authenticated;

-- The signup form needs to tell "wrong key" from "already used" before the
-- account exists, without exposing which keys are valid.
create or replace function public.key_is_valid(p_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from doctors
    where remote_token <> '' and remote_token = btrim(coalesce(p_key, ''))
  );
$$;

revoke all on function public.key_is_valid(text) from public;
grant execute on function public.key_is_valid(text) to anon, authenticated;
