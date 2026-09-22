-- The back-office's work queue: listing requests, error reports, feedback.
--
-- Same shape as the other admin RPCs (20260810020000): SECURITY DEFINER,
-- gated by _check_admin_secret, granted to anon. The website has no
-- service-role key, so this is the only way the operator console reaches rows
-- that RLS otherwise hides from everyone but a signed-in staff member — and
-- the admin is not one, it holds a separate cookie.

-- ─── Accent folding without requiring the unaccent extension ─────────────────

/*
 * `unaccent` is an extension, and enabling one is a permission this migration
 * should not assume it has. Slugs only ever need the Latin-1 letters that
 * appear in French and Tunisian place names, so a translate() covers it —
 * and unlike unaccent it cannot fail at install time on a locked-down project.
 */
create or replace function public.unaccent_or_self(p text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    coalesce(p, ''),
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- ─── Listing requests ────────────────────────────────────────────────────────

create or replace function public.admin_list_claims(
  p_admin_secret text,
  p_status text default null
)
returns table (
  id              uuid,
  intent          text,
  status          text,
  kind            text,
  establishment   text,
  city            text,
  contact_name    text,
  phone           text,
  email           text,
  professional_id text,
  message         text,
  resolution      text,
  created_at      timestamptz,
  provider_id     uuid,
  provider_name   text,
  provider_slug   text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    c.id, c.intent, c.status, c.kind::text, c.establishment, c.city,
    c.contact_name, c.phone, c.email, c.professional_id, c.message,
    c.resolution, c.created_at,
    c.provider_id, p.name, p.slug
  from public.provider_claims c
  left join public.providers p on p.id = c.provider_id
  where p_status is null or c.status = p_status
  order by
    -- Untouched requests first whatever the filter: a queue that buries the
    -- thing you came to do under last month's resolved ones is not a queue.
    case when c.status = 'nouveau' then 0 else 1 end,
    c.created_at desc;
end;
$$;

/*
 * Turn an accepted `inscription` into a real listing.
 *
 * Creates the provider as an UNPUBLISHED draft. Approving a claim means "this
 * person is who they say they are", not "this listing is ready for the
 * public" — the address, hours and tariffs still have to be filled in, and a
 * half-empty profile going live is worse than none.
 *
 * Idempotent: a claim already carrying a provider_id returns that provider
 * rather than creating a second one, so a double-clicked button cannot
 * duplicate an establishment.
 */
create or replace function public.admin_approve_claim(
  p_admin_secret text,
  p_claim uuid
)
returns table (provider_id uuid, provider_slug text, created boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.provider_claims%rowtype;
  v_slug  text;
  v_base  text;
  v_n     int := 1;
  v_id    uuid;
begin
  perform public._check_admin_secret(p_admin_secret);

  select * into v_claim from public.provider_claims where id = p_claim;
  if not found then
    raise exception 'CLAIM_NOT_FOUND';
  end if;

  -- A revendication has nothing to create: the listing already exists and the
  -- membership is granted separately, once the person has an account.
  if v_claim.intent <> 'inscription' then
    update public.provider_claims
      set status = 'accepte', resolved_at = now()
      where id = p_claim;
    return query select v_claim.provider_id, null::text, false;
    return;
  end if;

  if v_claim.provider_id is not null then
    update public.provider_claims
      set status = 'accepte', resolved_at = now()
      where id = p_claim;
    return query
      select p.id, p.slug, false from public.providers p where p.id = v_claim.provider_id;
    return;
  end if;

  -- Slug from the name, then the city, then a counter. Lower-cased, accents
  -- folded, anything else collapsed to a single dash.
  v_base := trim(both '-' from regexp_replace(
    lower(public.unaccent_or_self(coalesce(nullif(v_claim.establishment, ''), 'etablissement')
          || case when v_claim.city <> '' then '-' || v_claim.city else '' end)),
    '[^a-z0-9]+', '-', 'g'
  ));
  if v_base = '' then v_base := 'etablissement'; end if;

  v_slug := v_base;
  while exists (select 1 from public.providers where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.providers (
    kind, slug, name, city, phone, email, booking_mode, source, is_published
  )
  values (
    v_claim.kind,
    v_slug,
    coalesce(nullif(v_claim.establishment, ''), v_claim.contact_name),
    v_claim.city,
    v_claim.phone,
    v_claim.email,
    -- Whatever suits the trade; the owner can change it afterwards.
    case
      when v_claim.kind in ('pharmacie', 'parapharmacie') then 'aucune'
      else 'demande'
    end::public.booking_mode,
    'revendique'::public.provider_source,
    false
  )
  returning id into v_id;

  update public.provider_claims
    set status = 'accepte', provider_id = v_id, resolved_at = now()
    where id = p_claim;

  return query select v_id, v_slug, true;
end;
$$;

/** Refuse, or park, a request — with a reason the operator can read later. */
create or replace function public.admin_resolve_claim(
  p_admin_secret text,
  p_claim uuid,
  p_status text,
  p_resolution text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  if p_status not in ('nouveau', 'en_cours', 'accepte', 'refuse') then
    raise exception 'BAD_STATUS';
  end if;

  update public.provider_claims
  set status = p_status,
      resolution = coalesce(p_resolution, ''),
      resolved_at = case when p_status in ('accepte', 'refuse') then now() else null end
  where id = p_claim;
end;
$$;

-- ─── Error reports ───────────────────────────────────────────────────────────

create or replace function public.admin_list_reports(
  p_admin_secret text,
  p_status text default null
)
returns table (
  id            uuid,
  reason        text,
  detail        text,
  contact       text,
  status        text,
  created_at    timestamptz,
  provider_id   uuid,
  provider_name text,
  provider_slug text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    r.id, r.reason, r.detail, r.contact, r.status, r.created_at,
    r.provider_id, p.name, p.slug
  from public.provider_reports r
  left join public.providers p on p.id = r.provider_id
  where p_status is null or r.status = p_status
  order by
    case when r.status = 'nouveau' then 0 else 1 end,
    r.created_at desc;
end;
$$;

create or replace function public.admin_resolve_report(
  p_admin_secret text,
  p_report uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  if p_status not in ('nouveau', 'traite', 'rejete') then
    raise exception 'BAD_STATUS';
  end if;
  update public.provider_reports set status = p_status where id = p_report;
end;
$$;

-- ─── Site feedback ───────────────────────────────────────────────────────────

create or replace function public.admin_list_feedback(
  p_admin_secret text,
  p_status text default null
)
returns table (
  id         uuid,
  rating     smallint,
  category   text,
  message    text,
  contact    text,
  page_path  text,
  status     text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select f.id, f.rating, f.category, f.message, f.contact, f.page_path,
         f.status, f.created_at
  from public.site_feedback f
  where p_status is null or f.status = p_status
  order by
    case when f.status = 'nouveau' then 0 else 1 end,
    f.created_at desc;
end;
$$;

create or replace function public.admin_resolve_feedback(
  p_admin_secret text,
  p_feedback uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  if p_status not in ('nouveau', 'lu', 'traite', 'rejete') then
    raise exception 'BAD_STATUS';
  end if;
  update public.site_feedback set status = p_status where id = p_feedback;
end;
$$;

-- ─── How many are waiting, for the nav badge ─────────────────────────────────

create or replace function public.admin_intake_counts(p_admin_secret text)
returns table (claims bigint, reports bigint, feedback bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);
  return query
  select
    (select count(*) from public.provider_claims  where status = 'nouveau'),
    (select count(*) from public.provider_reports where status = 'nouveau'),
    (select count(*) from public.site_feedback    where status = 'nouveau');
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────
--
-- anon may EXECUTE these; the secret inside each one is what actually gates
-- them, exactly as with the existing admin RPCs.

revoke all on function public.admin_list_claims(text, text) from public;
revoke all on function public.admin_approve_claim(text, uuid) from public;
revoke all on function public.admin_resolve_claim(text, uuid, text, text) from public;
revoke all on function public.admin_list_reports(text, text) from public;
revoke all on function public.admin_resolve_report(text, uuid, text) from public;
revoke all on function public.admin_list_feedback(text, text) from public;
revoke all on function public.admin_resolve_feedback(text, uuid, text) from public;
revoke all on function public.admin_intake_counts(text) from public;

grant execute on function public.admin_list_claims(text, text) to anon;
grant execute on function public.admin_approve_claim(text, uuid) to anon;
grant execute on function public.admin_resolve_claim(text, uuid, text, text) to anon;
grant execute on function public.admin_list_reports(text, text) to anon;
grant execute on function public.admin_resolve_report(text, uuid, text) to anon;
grant execute on function public.admin_list_feedback(text, text) to anon;
grant execute on function public.admin_resolve_feedback(text, uuid, text) to anon;
grant execute on function public.admin_intake_counts(text) to anon;
grant execute on function public.unaccent_or_self(text) to anon, authenticated;
