-- Let an approved inscription point at the listing it produced.
--
-- The original constraint read:
--
--   (intent = 'inscription'   and provider_id is null and kind is not null) or
--   (intent = 'revendication' and provider_id is not null)
--
-- which conflated two different things: how the request ARRIVED, and what it
-- BECAME. `intent` is a permanent fact about its origin; `provider_id` is the
-- listing it ended up attached to. Forbidding the second for an inscription
-- meant `admin_approve_claim` — whose whole job is to create the provider and
-- link it back — could never commit. Approving a pharmacy failed with
-- "violates check constraint provider_claims_shape", after the operator had
-- already decided to accept it.
--
-- The rule that actually matters is about what must be present when the
-- request is MADE: an inscription has to say what kind of establishment to
-- create, and a revendication has to name the one it is claiming. Neither says
-- anything about what may be filled in afterwards.

alter table public.provider_claims
  drop constraint if exists provider_claims_shape;

alter table public.provider_claims
  add constraint provider_claims_shape check (
    (intent = 'inscription'   and kind is not null) or
    (intent = 'revendication' and provider_id is not null)
  );

comment on constraint provider_claims_shape on public.provider_claims is
  'What a request must carry to be made. An inscription may gain a provider_id once approved.';
