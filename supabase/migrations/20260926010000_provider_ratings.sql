-- Patient ratings, restricted to people who actually attended.
--
-- `site_feedback` says in its own comment that rating an establishment is a
-- separate product decision with its own weight. This migration is that
-- decision being taken deliberately, not that table quietly growing into it.
-- The two stay apart: site_feedback is about the website and is never
-- published; this is about one establishment and is published as an average.
--
-- Two constraints do most of the safety work here:
--
--   1. A rating requires an accepted appointment, at this establishment, for
--      this phone number, whose slot has already passed. A competitor cannot
--      leave one, and neither can somebody who merely browsed the page.
--   2. Stars only — no free text anywhere in this table. There is no prose to
--      moderate, nothing defamatory to publish about a named practitioner, and
--      no right-of-reply queue to staff. Adding a comment column later would
--      re-open every one of those questions, which is why there isn't one.
--
-- One rating per appointment, enforced by a unique key rather than by the
-- application, so a double-submit cannot inflate anybody's average.

-- ─── The ratings ─────────────────────────────────────────────────────────────

create table if not exists public.provider_ratings (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,

  -- The visit this rating is for. Unique, so one attendance buys one rating.
  -- Deleting the request deletes the rating: a visit that never happened
  -- should not keep affecting an average.
  request_id  uuid not null unique
                references public.appointment_requests (id) on delete cascade,

  stars       smallint not null check (stars between 1 and 5),

  -- Optional detail, still numeric. Null means "not answered", which is not
  -- the same as a low score and never counts toward one.
  punctuality smallint check (punctuality between 1 and 5),
  welcome     smallint check (welcome between 1 and 5),
  explanation smallint check (explanation between 1 and 5),

  created_at  timestamptz not null default now()
);

comment on table public.provider_ratings is
  'Stars only, one per attended appointment. Never free text — see the header.';

create index if not exists provider_ratings_provider_idx
  on public.provider_ratings (provider_id, created_at desc);

-- Nobody reads these rows over the wire. What the public sees is the average
-- kept on `providers`; the individual scores stay closed so a small practice
-- cannot have one patient's rating inferred from a timestamp.
alter table public.provider_ratings enable row level security;

-- ─── The published average ───────────────────────────────────────────────────

alter table public.providers
  add column if not exists rating_avg   numeric(3, 2),
  add column if not exists rating_count integer not null default 0;

comment on column public.providers.rating_avg is
  'Mean of provider_ratings.stars, or null while nothing has been rated.';

/*
 * Recount one establishment.
 *
 * Split out from the trigger because an UPDATE that moved a rating between two
 * providers has to leave both of them correct, and a DELETE has to work at all
 * — in a DELETE trigger PL/pgSQL never assigns NEW, so reaching for
 * `new.provider_id` there raises "record new is not assigned yet" rather than
 * quietly yielding null.
 */
create or replace function public.recount_provider_rating(p_provider uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.providers p
     set rating_count = stats.n,
         -- Null rather than 0.00 with no ratings: "not rated yet" and "rated
         -- zero" must not render as the same thing.
         rating_avg   = case when stats.n = 0 then null else round(stats.avg, 2) end
    from (
      select count(*) as n, avg(stars) as avg
        from public.provider_ratings
       where provider_id = p_provider
    ) as stats
   where p.id = p_provider;
end $$;

create or replace function public.refresh_provider_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.recount_provider_rating(old.provider_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recount_provider_rating(new.provider_id);
  end if;

  return null;
end $$;

drop trigger if exists provider_ratings_refresh on public.provider_ratings;
create trigger provider_ratings_refresh
  after insert or update or delete on public.provider_ratings
  for each row execute function public.refresh_provider_rating();

-- ─── Submitting one ──────────────────────────────────────────────────────────

/*
 * Rate an establishment, if this phone attended it.
 *
 * security definer because `anon` deliberately cannot see appointment_requests
 * — checking "did this person attend?" must happen inside the database, not by
 * handing the browser the appointment table.
 *
 * Returns a plain jsonb verdict instead of raising, so the caller can tell a
 * patient "we can't find a past appointment for that number" without a 500 and
 * without leaking which of the several checks failed.
 *
 * Note for whoever maintains this: a caller who already knows somebody's phone
 * number can learn whether that number attended a given practice, by watching
 * which verdict comes back. That is why /api/public/ratings rate-limits per IP
 * the way the request form does. Tightening it further would mean asking for
 * something only the patient could know — the appointment date, say — which
 * costs more honest ratings than it prevents dishonest probes.
 */
create or replace function public.submit_provider_rating(
  p_provider_slug text,
  p_phone         text,
  p_stars         smallint,
  p_punctuality   smallint default null,
  p_welcome       smallint default null,
  p_explanation   smallint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id  uuid;
  v_doctor_id    uuid;
  v_request_id   uuid;
  v_phone        text;
begin
  if p_stars is null or p_stars not between 1 and 5 then
    return jsonb_build_object('ok', false, 'error', 'stars');
  end if;

  select id, legacy_doctor_id
    into v_provider_id, v_doctor_id
    from public.providers
   where slug = p_provider_slug
     and is_published;

  if v_provider_id is null then
    return jsonb_build_object('ok', false, 'error', 'provider');
  end if;

  -- An establishment that does not take its appointments through DoctorY has
  -- no attendance to check against, so it cannot be rated at all.
  if v_doctor_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_rateable');
  end if;

  -- Compared digits-only: the same patient may have typed +216 one time and a
  -- local number the next, and both are the same person.
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(v_phone) < 8 then
    return jsonb_build_object('ok', false, 'error', 'phone');
  end if;

  select r.id
    into v_request_id
    from public.appointment_requests r
   where r.doctor_id = v_doctor_id
     and r.status = 'accepte'
     and r.scheduled_at is not null
     and r.scheduled_at < now()
     and regexp_replace(r.phone, '\D', '', 'g') = v_phone
     and not exists (
       select 1 from public.provider_ratings g where g.request_id = r.id
     )
   order by r.scheduled_at desc
   limit 1;

  if v_request_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_visit');
  end if;

  insert into public.provider_ratings
    (provider_id, request_id, stars, punctuality, welcome, explanation)
  values
    (v_provider_id, v_request_id, p_stars, p_punctuality, p_welcome, p_explanation);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.submit_provider_rating(text, text, smallint, smallint, smallint, smallint) from public;
grant execute on function public.submit_provider_rating(text, text, smallint, smallint, smallint, smallint) to anon, authenticated;

-- ─── Backfill ────────────────────────────────────────────────────────────────
-- Re-runnable, and correct on a database that already holds ratings.

update public.providers p
   set rating_count = stats.n,
       rating_avg   = case when stats.n = 0 then null else round(stats.avg, 2) end
  from (
    select pr.id as provider_id,
           count(g.id) as n,
           avg(g.stars) as avg
      from public.providers pr
      left join public.provider_ratings g on g.provider_id = pr.id
     group by pr.id
  ) as stats
 where p.id = stats.provider_id;
