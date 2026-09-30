-- Let a staff member delete their own account from the Profil page.
--
-- Deleting an auth user needs the service role, which the website does not
-- have (see license_admin), so this is a SECURITY DEFINER function — scoped
-- to auth.uid(), never to an id the caller passes, so it can only ever delete
-- the account making the call.
--
-- It re-checks the current password itself rather than trusting the page's
-- "type SUPPRIMER" dialog: that dialog is for the person, this is for the
-- session — a signed-in screen left open at the front desk must not be
-- enough to destroy the account.
--
-- What goes with it follows the existing foreign keys: the staff row
-- cascades; requests she reviewed and listings she claimed keep their data
-- with the reference set to null. Patients and appointments belong to the
-- doctor, not to her, and are untouched.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.delete_my_account(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_hash text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;

  select encrypted_password into v_hash from auth.users where id = v_uid;
  if v_hash is null or v_hash = '' or v_hash <> crypt(coalesce(p_password, ''), v_hash) then
    raise exception 'WRONG_PASSWORD';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
