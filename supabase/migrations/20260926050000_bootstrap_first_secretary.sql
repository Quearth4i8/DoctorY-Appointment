-- The first secretary of a fresh installation could never sign up.
--
-- Three functions all agreed that a pairing key is only real once it sits in
-- `doctors.remote_token`, and exactly one function ever writes that column —
-- `link_doctor_endpoint`, which demands `is_staff()`. So:
--
--   * signup calls `key_is_valid`      → false, because nobody bound the key yet
--   * the desktop tunnel calls
--     `register_doctor_endpoint`       → UNKNOWN_KEY, same reason
--   * binding the key needs a staff
--     account, which needs signup      → deadlock
--
-- A doctor installed the app, read the key off "Licence & liaison", typed it
-- into /inscription and got "Cette clé de liaison n'est pas reconnue" — while
-- holding the only correct key in existence. The heartbeat comment in
-- tunnel.py assumed the secretary pastes the key in Paramètres first, but she
-- cannot reach Paramètres without already being staff.
--
-- So the very first account has to be allowed to bring its own key. The rule
-- that keeps that from becoming a way in: a practice may be adopted only while
-- it holds NO key and has NO staff. Nothing has been set up there, so there is
-- nothing to take over — and the moment a real secretary exists, the door is
-- shut and any later key change goes back through `link_doctor_endpoint`,
-- which still requires membership.

/**
 * The practice a brand-new installation is allowed to adopt, or null.
 *
 * Deliberately ungranted: it is reachable only from the SECURITY DEFINER
 * functions below, which run as the owner.
 *
 * A staff row with a null doctor_id counts as occupying the oldest practice,
 * because `can_access_request` resolves it there. Treating such a practice as
 * empty would hand a stranger the agenda that staff member already reads.
 */
create or replace function public.bootstrappable_doctor()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from doctors d
  where d.remote_token = ''
    and not exists (
      select 1 from staff s
      where s.doctor_id = d.id or s.doctor_id is null
    )
  order by d.created_at
  limit 1;
$$;

revoke all on function public.bootstrappable_doctor() from public, anon, authenticated;

-- Still a boolean, so the signup form needs no new shape: it now also says yes
-- to an unclaimed key that the claim below would accept, instead of rejecting
-- the one key the doctor actually has.
create or replace function public.key_is_valid(p_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
           select 1 from doctors
           where remote_token <> '' and remote_token = btrim(coalesce(p_key, ''))
         )
         or (
           length(btrim(coalesce(p_key, ''))) >= 16
           and public.bootstrappable_doctor() is not null
         );
$$;

revoke all on function public.key_is_valid(text) from public;
grant execute on function public.key_is_valid(text) to anon, authenticated;

/**
 * Binds the caller to a practice using the doctor's pairing key.
 *
 * Unchanged when the key is already bound. New: when nobody holds the key and
 * an empty practice is available, the key is attached there and the caller
 * becomes its first secretary — which is what makes a fresh install usable at
 * all, and what makes the desktop app's registration start succeeding.
 */
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

  -- Matches the form's own check, and stops a blank or truncated key from
  -- reaching the adoption branch below.
  if length(v_key) < 16 then
    raise exception 'INVALID_KEY';
  end if;

  select id into v_doctor
  from doctors
  where remote_token <> '' and remote_token = v_key;

  if v_doctor is null then
    -- First run. `for update` re-checks remote_token after taking the lock, so
    -- two simultaneous signups holding different keys cannot both adopt the
    -- same row — the second one finds it bound and is refused.
    select d.id into v_doctor
    from doctors d
    where d.id = public.bootstrappable_doctor()
      and d.remote_token = ''
    for update;

    if v_doctor is null then
      raise exception 'INVALID_KEY';
    end if;

    update doctors
    set remote_token   = v_key,
        remote_api_url = '',   -- unknown until the app's heartbeat registers
        remote_seen_at = null
    where id = v_doctor;
  end if;

  insert into staff (user_id, role, full_name, doctor_id)
  values (v_uid, 'secretary', left(btrim(coalesce(p_full_name, '')), 80), v_doctor);
end;
$$;

revoke all on function public.claim_staff_with_key(text, text) from public;
grant execute on function public.claim_staff_with_key(text, text) to authenticated;
