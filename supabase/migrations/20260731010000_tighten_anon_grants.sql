-- Tighten the anon role down to exactly one privilege: inserting a request.
--
-- Supabase grants all DML on new public-schema tables to anon by default, so
-- after the initial migration anon still held table-level select/update/delete
-- and was being stopped by RLS alone. This makes the privilege level agree with
-- the policy level, so a future policy mistake cannot open a read or a write.
--
-- Note: anon deliberately keeps NO select privilege, so the public form must
-- insert with `Prefer: return=minimal` (it must not ask for the row back).

revoke all on public.appointment_requests from anon;
grant insert on public.appointment_requests to anon;

revoke all on public.staff from anon;

-- Clean up the row inserted while testing the policies.
delete from public.appointment_requests where last_name = 'ZZ_TEST_RLS';
