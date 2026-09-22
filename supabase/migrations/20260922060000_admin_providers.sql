-- Editing an establishment from the back-office.
--
-- Approving a request creates a draft with a name, a phone and nothing else.
-- Until now there was no way to finish it: `/parametres` edits the `doctors`
-- table, which only covers the one legacy cabinet, so a newly approved
-- pharmacy could only be completed by hand in the Supabase table editor.
--
-- Same gate as the other admin RPCs: SECURITY DEFINER behind
-- _check_admin_secret, granted to anon, because the console holds a cookie
-- rather than a Supabase session and RLS would otherwise hide every draft.

-- ─── Listing ─────────────────────────────────────────────────────────────────

create or replace function public.admin_list_providers(
  p_admin_secret text,
  p_search text default null,
  p_drafts_only boolean default false
)
returns table (
  id            uuid,
  kind          text,
  slug          text,
  name          text,
  city          text,
  phone         text,
  is_published  boolean,
  hours_count   bigint,
  services_count bigint,
  duty_count    bigint,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public._check_admin_secret(p_admin_secret);

  return query
  select
    p.id, p.kind::text, p.slug, p.name, p.city, p.phone, p.is_published,
    (select count(*) from public.opening_hours h where h.provider_id = p.id),
    (select count(*) from public.services s where s.provider_id = p.id),
    (select count(*) from public.duty_shifts d where d.provider_id = p.id),
    p.created_at
  from public.providers p
  where (not p_drafts_only or not p.is_published)
    and (
      p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or p.city ilike '%' || p_search || '%'
      or p.slug ilike '%' || p_search || '%'
    )
  order by
    -- Drafts first: they are the ones with work outstanding.
    p.is_published, p.created_at desc;
end;
$$;

-- ─── Reading one, with its children ──────────────────────────────────────────

create or replace function public.admin_get_provider(
  p_admin_secret text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  perform public._check_admin_secret(p_admin_secret);

  select to_jsonb(p) || jsonb_build_object(
    'kind', p.kind::text,
    'booking_mode', p.booking_mode::text,
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'weekday', h.weekday,
               'opens_at', to_char(h.opens_at, 'HH24:MI'),
               'closes_at', to_char(h.closes_at, 'HH24:MI'))
             order by h.weekday, h.opens_at)
      from public.opening_hours h where h.provider_id = p.id
    ), '[]'::jsonb),
    'duty', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'starts_at', d.starts_at,
               'ends_at', d.ends_at, 'kind', d.kind)
             order by d.starts_at)
      from public.duty_shifts d where d.provider_id = p.id
    ), '[]'::jsonb)
  )
  into v
  from public.providers p
  where p.id = p_id;

  if v is null then raise exception 'PROVIDER_NOT_FOUND'; end if;
  return v;
end;
$$;

-- ─── Saving ──────────────────────────────────────────────────────────────────

/*
 * One call saves the establishment and replaces its hours and duty roster.
 *
 * Wholesale replacement rather than a diff: the editor sends the complete set
 * it is showing, so "I deleted Saturday" and "Saturday was never there" become
 * the same instruction and cannot drift apart. It is one statement, so a bad
 * roster rolls the whole save back rather than half-applying it.
 *
 * `coalesce(p_data->>'x', p.x)` throughout: a key the caller omitted keeps its
 * current value instead of being blanked, so a partial payload is safe.
 */
create or replace function public.admin_save_provider(
  p_admin_secret text,
  p_id uuid,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r jsonb;
begin
  perform public._check_admin_secret(p_admin_secret);

  update public.providers p set
    name        = coalesce(p_data->>'name', p.name),
    kind        = coalesce((p_data->>'kind')::public.provider_kind, p.kind),
    bio         = coalesce(p_data->>'bio', p.bio),
    photo_url   = coalesce(p_data->>'photo_url', p.photo_url),
    address     = coalesce(p_data->>'address', p.address),
    city        = coalesce(p_data->>'city', p.city),
    postcode    = coalesce(p_data->>'postcode', p.postcode),
    governorate = coalesce(p_data->>'governorate', p.governorate),
    -- Sent as "" when cleared; NULLIF keeps that out of a numeric cast.
    latitude    = case when p_data ? 'latitude'
                       then nullif(p_data->>'latitude', '')::double precision
                       else p.latitude end,
    longitude   = case when p_data ? 'longitude'
                       then nullif(p_data->>'longitude', '')::double precision
                       else p.longitude end,
    phone       = coalesce(p_data->>'phone', p.phone),
    phone_alt   = coalesce(p_data->>'phone_alt', p.phone_alt),
    email       = coalesce(p_data->>'email', p.email),
    website     = coalesce(p_data->>'website', p.website),
    booking_mode = coalesce((p_data->>'booking_mode')::public.booking_mode, p.booking_mode),
    languages   = coalesce(
                    (select array_agg(value::text)
                     from jsonb_array_elements_text(p_data->'languages')),
                    p.languages),
    accepts_cnam         = coalesce((p_data->>'accepts_cnam')::boolean, p.accepts_cnam),
    third_party_payer    = coalesce((p_data->>'third_party_payer')::boolean, p.third_party_payer),
    wheelchair_access    = coalesce((p_data->>'wheelchair_access')::boolean, p.wheelchair_access),
    accepts_new_patients = coalesce((p_data->>'accepts_new_patients')::boolean, p.accepts_new_patients),
    open_24_7            = coalesce((p_data->>'open_24_7')::boolean, p.open_24_7),
    has_emergency        = coalesce((p_data->>'has_emergency')::boolean, p.has_emergency)
  where p.id = p_id;

  if not found then raise exception 'PROVIDER_NOT_FOUND'; end if;

  if p_data ? 'hours' then
    delete from public.opening_hours where provider_id = p_id;
    for r in select * from jsonb_array_elements(p_data->'hours') loop
      -- Skip anything incomplete rather than failing the save: a half-typed
      -- row in the editor should not cost the operator the rest of the form.
      continue when coalesce(r->>'opens_at','') = '' or coalesce(r->>'closes_at','') = '';
      continue when (r->>'closes_at')::time <= (r->>'opens_at')::time;
      insert into public.opening_hours (provider_id, weekday, opens_at, closes_at)
      values (p_id, (r->>'weekday')::smallint, (r->>'opens_at')::time, (r->>'closes_at')::time);
    end loop;
  end if;

  if p_data ? 'duty' then
    delete from public.duty_shifts where provider_id = p_id;
    for r in select * from jsonb_array_elements(p_data->'duty') loop
      continue when coalesce(r->>'starts_at','') = '' or coalesce(r->>'ends_at','') = '';
      continue when (r->>'ends_at')::timestamptz <= (r->>'starts_at')::timestamptz;
      insert into public.duty_shifts (provider_id, starts_at, ends_at, kind, source)
      values (
        p_id,
        (r->>'starts_at')::timestamptz,
        (r->>'ends_at')::timestamptz,
        coalesce(r->>'kind', 'nuit'),
        'manuel'::public.provider_source
      );
    end loop;
  end if;
end;
$$;

/*
 * Publishing is its own call, never a field on the save.
 *
 * Going live is a decision, not a side effect of fixing a typo — and it has a
 * precondition the form cannot enforce: a listing with no address and no hours
 * answers none of the questions a visitor has, so it is refused here rather
 * than quietly published empty.
 */
create or replace function public.admin_publish_provider(
  p_admin_secret text,
  p_id uuid,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_address text;
  v_hours   bigint;
  v_always  boolean;
begin
  perform public._check_admin_secret(p_admin_secret);

  if p_published then
    select p.address, p.open_24_7 into v_address, v_always
    from public.providers p where p.id = p_id;

    if v_address is null or trim(v_address) = '' then
      raise exception 'NO_ADDRESS';
    end if;

    select count(*) into v_hours from public.opening_hours where provider_id = p_id;
    -- A place open around the clock genuinely has no weekly ranges to give.
    if v_hours = 0 and not coalesce(v_always, false) then
      raise exception 'NO_HOURS';
    end if;
  end if;

  update public.providers set is_published = p_published where id = p_id;
  if not found then raise exception 'PROVIDER_NOT_FOUND'; end if;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.admin_list_providers(text, text, boolean) from public;
revoke all on function public.admin_get_provider(text, uuid) from public;
revoke all on function public.admin_save_provider(text, uuid, jsonb) from public;
revoke all on function public.admin_publish_provider(text, uuid, boolean) from public;

grant execute on function public.admin_list_providers(text, text, boolean) to anon;
grant execute on function public.admin_get_provider(text, uuid) to anon;
grant execute on function public.admin_save_provider(text, uuid, jsonb) to anon;
grant execute on function public.admin_publish_provider(text, uuid, boolean) to anon;
