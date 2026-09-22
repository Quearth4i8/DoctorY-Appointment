-- What people think of the site itself.
--
-- Deliberately NOT reviews of establishments. Rating a doctor is a product
-- decision with its own weight — moderation, defamation, bought reviews — and
-- it is not this. This table only ever holds an opinion about the website, so
-- nothing here can be mistaken for, or later quietly promoted into, a public
-- rating attached to someone's practice.
--
-- Nothing here is published. It is a private channel to whoever runs the
-- platform, which is why anon may insert and nobody but staff may read.

create table if not exists public.site_feedback (
  id        uuid primary key default gen_random_uuid(),

  -- 1–5, or null: plenty of useful feedback comes with no score attached, and
  -- forcing one would mean inventing a number to get to the message.
  rating    smallint check (rating between 1 and 5),

  category  text not null default 'suggestion'
              check (category in ('suggestion', 'probleme', 'compliment', 'autre')),
  message   text not null,
  -- Optional: an answer is only possible if they want one.
  contact   text not null default '',

  /*
   * Which page they were on.
   *
   * A path only — never the query string, which on this site carries what
   * somebody searched for and where they are. "Search feels confusing" is
   * worth ten times more when you know it came from /recherche, and nothing is
   * gained by also recording that they looked for a dermatologist.
   */
  page_path text not null default '',

  status    text not null default 'nouveau'
              check (status in ('nouveau', 'lu', 'traite', 'rejete')),
  note      text not null default '',

  created_at timestamptz not null default now()
);

comment on table public.site_feedback is
  'Opinions about the website. Never about an establishment — see provider_reports for that.';

create index if not exists site_feedback_open_idx
  on public.site_feedback (status, created_at desc);

create index if not exists site_feedback_rating_idx
  on public.site_feedback (rating)
  where rating is not null;

alter table public.site_feedback enable row level security;

-- Anyone may write one. The check pins the columns a visitor is allowed to
-- set, so the insert cannot arrive pre-triaged.
drop policy if exists "anyone sends feedback" on public.site_feedback;
create policy "anyone sends feedback"
  on public.site_feedback for insert to anon, authenticated
  with check (status = 'nouveau' and note = '');

-- Reading is the operator's. A visitor who could read this would be reading
-- other people's contact details.
drop policy if exists "staff read feedback" on public.site_feedback;
create policy "staff read feedback"
  on public.site_feedback for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

revoke all on public.site_feedback from anon;
grant insert on public.site_feedback to anon;
grant select, insert, update, delete on public.site_feedback to authenticated;
