-- Counting establishments by trade, in one round trip and without moving rows.
--
-- The landing page, the search page and the professional page all show "how
-- many pharmacies / laboratories / doctors are listed". Done from the client
-- that is either one query that transfers EVERY published row to count them,
-- or twelve head-only counts that each cost a round trip. The first collapses
-- once a bought pharmacy dataset lands; the second is twelve times the latency
-- on every page view, for ever.
--
-- A GROUP BY belongs in the database. This is one request, one scan, twelve
-- integers back.

create or replace function public.provider_counts_by_kind()
returns table (kind public.provider_kind, n bigint)
language sql
-- SECURITY INVOKER (the default, stated for the record): the counts must obey
-- Row Level Security exactly as a direct select would, so an unpublished draft
-- is never revealed by being counted.
security invoker
stable
parallel safe
set search_path = public, pg_temp
as $$
  select p.kind, count(*)::bigint
  from public.providers p
  where p.is_published
  group by p.kind;
$$;

comment on function public.provider_counts_by_kind() is
  'Published establishments per kind. Respects RLS; returns counts, never rows.';

revoke all on function public.provider_counts_by_kind() from public;
grant execute on function public.provider_counts_by_kind() to anon, authenticated;
