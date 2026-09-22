-- How an establishment gets onto the platform.
--
-- Two doors, one table:
--
--   inscription    — "I run a pharmacy that isn't listed." No provider row
--                    exists yet, so `provider_id` is null and `kind` says what
--                    to create.
--   revendication  — "That listing is mine." The row already exists, imported
--                    from a bought dataset or entered by the operator, and
--                    someone is asking for the keys to it.
--
-- Both are REQUESTS, not actions. Neither creates a provider and neither
-- grants membership: an operator reads the queue and decides. That matters
-- most for the second one — an annuaire seeded from imported data is full of
-- establishments nobody here has met, and a self-service "claim" button would
-- hand any of them to whoever asked first.

create table if not exists public.provider_claims (
  id          uuid primary key default gen_random_uuid(),

  intent      text not null check (intent in ('inscription', 'revendication')),

  -- Set for a revendication, null for an inscription.
  provider_id uuid references public.providers (id) on delete cascade,
  -- Set for an inscription, null for a revendication.
  kind        public.provider_kind,

  -- What the establishment is called, and who is asking for it.
  establishment text not null default '',
  city          text not null default '',
  contact_name  text not null,
  phone         text not null,
  email         text not null default '',
  -- Ordre des médecins number, registre de commerce, whatever they have. Not
  -- verified here — it is what the operator rings up to check.
  professional_id text not null default '',
  message       text not null default '',

  status      text not null default 'nouveau'
                check (status in ('nouveau', 'en_cours', 'accepte', 'refuse')),
  -- Filled in when an operator resolves it, so a refusal can be explained.
  resolution  text not null default '',
  resolved_at timestamptz,

  created_at  timestamptz not null default now(),

  -- An inscription names a kind, a revendication names a provider. Enforcing
  -- it here rather than trusting the form means a malformed insert is a error
  -- at the door instead of a row the back-office cannot act on.
  constraint provider_claims_shape check (
    (intent = 'inscription'   and provider_id is null and kind is not null) or
    (intent = 'revendication' and provider_id is not null)
  )
);

comment on table public.provider_claims is
  'Requests to list or to take ownership of an establishment. Never grants access by itself.';

create index if not exists provider_claims_open_idx
  on public.provider_claims (status, created_at desc);

create index if not exists provider_claims_provider_idx
  on public.provider_claims (provider_id)
  where provider_id is not null;

alter table public.provider_claims enable row level security;

-- Anyone may ask. Nobody but staff may read the queue: a visitor who could
-- read it would learn which establishments are unclaimed, which is exactly
-- the list you would want in order to claim one that is not yours.
drop policy if exists "anyone claims" on public.provider_claims;
create policy "anyone claims"
  on public.provider_claims for insert to anon, authenticated
  with check (status = 'nouveau' and resolution = '' and resolved_at is null);

drop policy if exists "staff handle claims" on public.provider_claims;
create policy "staff handle claims"
  on public.provider_claims for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

revoke all on public.provider_claims from anon;
grant insert on public.provider_claims to anon;
grant select, insert, update, delete on public.provider_claims to authenticated;
