-- Let a staff member change their own login email in one step, with no
-- confirmation email.
--
-- Requested by the operator: the confirmation-link flow
-- (supabase.auth.updateUser({ email })) depends on SMTP, a redirect allowlist
-- and "secure email change" all being set just so, and in practice left
-- secretaries unable to change their address at all.
--
-- What stands in for the email confirmation:
--   * the current password, checked here — an unattended signed-in screen is
--     not enough to move the account to someone else's address;
--   * the new address typed twice on the page, since nothing mails it to
--     prove it was typed right.
-- A typo that survives both fields is fixed by an admin from the Supabase
-- dashboard (Authentication → Users).
--
-- Scoped to auth.uid() — it can only ever change the caller's own account —
-- and limited to staff.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.change_my_email(p_new_email text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_new_email, '')));
  v_hash  text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  select encrypted_password into v_hash from auth.users where id = v_uid;
  if v_hash is null or v_hash = '' or v_hash <> crypt(coalesce(p_password, ''), v_hash) then
    raise exception 'WRONG_PASSWORD';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email and id <> v_uid) then
    raise exception 'EMAIL_TAKEN';
  end if;

  update auth.users
  set email                       = v_email,
      email_confirmed_at          = coalesce(email_confirmed_at, now()),
      -- Cancel any change still waiting on a link from the old flow, so an
      -- old email cannot later switch the address somewhere else.
      email_change                = '',
      email_change_token_new      = '',
      email_change_token_current  = '',
      email_change_confirm_status = 0,
      updated_at                  = now()
  where id = v_uid;

  -- The email identity keeps its own copy of the address.
  update auth.identities
  set identity_data = identity_data || jsonb_build_object('email', v_email),
      updated_at    = now()
  where user_id = v_uid
    and provider = 'email';

  return v_email;
end;
$$;

revoke all on function public.change_my_email(text, text) from public, anon;
grant execute on function public.change_my_email(text, text) to authenticated;
