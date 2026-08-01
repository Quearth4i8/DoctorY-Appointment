-- Keep the endpoint token hash out of public reach.
--
-- `grant select on public.doctors to anon` covers every column, so adding
-- remote_token_hash in 20260731100000 quietly published it: any visitor could
-- read the sha256 of the link token from a published profile. The token is 43
-- random characters, so this is not a practical break — but there is no reason
-- for it to leave the server, and a weaker token later would make it one.
--
-- Column-level grants fix it. anon keeps exactly the columns the public site
-- renders, plus remote_api_url and remote_seen_at, which the server needs to
-- find the practice. Those two are not secrets: the address answers 401 to
-- anyone without the token.

revoke select on public.doctors from anon;

grant select (
  id, slug, title, full_name, specialty, bio, photo_url,
  address, city, phone, email, latitude, longitude,
  hours, tariffs, is_published,
  remote_api_url, remote_seen_at
) on public.doctors to anon;

-- Staff keep full access, including the hash, so the settings page can manage
-- the link.
grant select, insert, update, delete on public.doctors to authenticated;
