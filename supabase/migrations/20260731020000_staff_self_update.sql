-- Let a staff member rename themselves from the Profil page — and nothing else.
--
-- The RLS policy restricts them to their OWN row, and the column-level grant
-- restricts them to the full_name COLUMN. Both are needed: a row-level policy
-- alone would happily let the secretary set her own role to 'doctor', because
-- Postgres policies gate rows, not columns.

drop policy if exists "staff rename self" on public.staff;
create policy "staff rename self"
  on public.staff for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.staff from authenticated;
grant update (full_name) on public.staff to authenticated;
