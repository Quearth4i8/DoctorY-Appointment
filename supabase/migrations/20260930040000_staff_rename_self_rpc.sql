-- Renaming yourself from the Profil page, as a function instead of a table
-- update.
--
-- The page used to `update staff set full_name = … where user_id = me` and
-- rely on the "staff rename self" policy (20260731020000). When that policy
-- is missing, Postgres does not refuse the update — it matches zero rows and
-- reports success, so the page said "Nom mis à jour" and nothing changed.
-- A function scoped to auth.uid() either renames the caller's own row or
-- raises, and touches no other column, whatever state the policies are in.

create or replace function public.rename_me(p_full_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_name = '' then
    raise exception 'EMPTY_NAME';
  end if;

  if length(v_name) > 120 then
    raise exception 'NAME_TOO_LONG';
  end if;

  update public.staff set full_name = v_name where user_id = auth.uid();

  if not found then
    raise exception 'NOT_STAFF';
  end if;

  return v_name;
end;
$$;

revoke all on function public.rename_me(text) from public, anon;
grant execute on function public.rename_me(text) to authenticated;
