# Mise en ligne

How the published website reaches the doctor's database, and what to set up.

## The problem this solves

During development everything runs on one machine, so `DOCTOR_API_URL` is
`http://127.0.0.1:8765` — the site and the doctor's API are neighbours.

Once the site is on Vercel, `127.0.0.1` means *Vercel's own server*, not the
doctor's PC. That machine sits behind a router with no public address and very
likely CGNAT, so nothing on the internet can dial it directly.

A tunnel fixes that: a small program on the doctor's PC opens an outbound
connection to Cloudflare and gets back a public HTTPS address. No port
forwarding, no fixed IP, no router configuration, no domain.

Because there is no domain, the address is a *quick tunnel* and changes on every
restart. So the app publishes its current address to Supabase and the website
looks it up — nothing anywhere hardcodes it.

```
Vercel (site)  ──HTTPS──►  Cloudflare  ──tunnel──►  doctor's PC  ──►  doctor.db
                                                    cloudflared
                                                    → 127.0.0.1:8766
```

## Why port 8766

The desktop app's API has **no authentication**. That was safe while it only
listened on `127.0.0.1:8765`, because that socket refuses outside connections.

A tunnel connects from the same machine, so the API cannot tell the doctor's own
app apart from the internet by looking at the source address. There are now two
listeners, both bound to `127.0.0.1`:

| port | who | token |
| --- | --- | --- |
| 8765 | the desktop app | not required |
| 8766 | the tunnel | **required** (`x-doctory-token`) |

Point the tunnel at **8766**, never 8765. Exposing 8765 would put every
consultation, document and CNAM form one URL away from anyone who found it.

The token is generated once and stored in the backend's `app_settings.json`
under `remote_api_token`.

## 1. On the doctor's PC — nothing to configure

The app does it all. On startup it:

1. listens on `127.0.0.1:8766` (token-protected),
2. launches `cloudflared` in quick-tunnel mode — no Cloudflare account, no
   domain, no router setup,
3. reads the `https://…trycloudflare.com` address it was given,
4. publishes that address to Supabase.

The address changes on every restart, which is why nothing hardcodes it.

**What you must ship with the app:** `cloudflared.exe` next to the backend
executable (or anywhere on PATH). Download it from
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
and place it beside `server.exe` in the installer. Without it the app still
works locally; only the website loses its connection.

**What the doctor must do once:** open the app's settings and send you the
*code de liaison* (`remote_api_token` in `app_settings.json`). One copy-paste,
never repeated.

## 2. Link the practice — one-time, done by you

The app needs to know where to publish, and Supabase needs to know which token
to trust. In the backend's `app_settings.json` add:

```json
{
  "supabase_url": "https://hfoibsulsziwqhlcmftw.supabase.co",
  "supabase_anon_key": "<anon key>",
  "doctor_slug": "medecin"
}
```

Then store the *hash* of the doctor's token in Supabase (never the token):

```sql
update public.doctors
set remote_token_hash = encode(digest('<code de liaison>', 'sha256'), 'hex')
where slug = 'medecin';
```

Registration is refused unless the hash matches, so nobody else can point the
practice's address at their own server and collect the token the site sends.

## 3. On Vercel

Import the GitHub repo and set these (Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hfoibsulsziwqhlcmftw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key |
| `DOCTOR_API_TOKEN` | the doctor's *code de liaison* |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | real key from the Turnstile dashboard |
| `TURNSTILE_SECRET_KEY` | real secret — **not** `NEXT_PUBLIC_` |
| `IP_HASH_SALT` | any long random string |

Do **not** set `DOCTOR_API_URL` in production: leaving it unset is what makes
the site look the address up from Supabase. Setting it pins the site to one
address and it will break on the next reboot.

Add your Vercel domain to the Turnstile site's hostnames, or every submission is
refused.

## 4. Check it

Find the address the app published:

```sql
select slug, remote_api_url, remote_seen_at from public.doctors;
```

`remote_seen_at` updating after a restart means registration works. Then, from
any machine:

```bash
# Must be 401 — proves the tunnel is not open to whoever finds the URL
curl -i https://<address>.trycloudflare.com/api/patients

# With the token — must be 200
curl -H "x-doctory-token: <code de liaison>" https://<address>.trycloudflare.com/api/patients
```

Then on the site: a doctor's page should show real slots, and the secretary
should see the agenda.

## What happens when the doctor's PC is off

The tunnel goes down and the site degrades rather than breaking:

| | |
| --- | --- |
| Patient sends a request | still works — it only touches Supabase |
| Public availability calendar | shows "créneaux non consultables", invites them to ask for a day |
| Secretary's agenda / patients | shows "cabinet injoignable" with a retry |
| Accepting a request | refused, request stays pending and retryable |

Nothing is lost or half-written: accepting writes to `doctor.db` first and only
then marks the request accepted.

If the site needs to show slots while the PC is off, that requires publishing
free/busy to Supabase on a schedule — a different design, not just config.

## Limits of a quick tunnel

`trycloudflare.com` is free and needs no account, which is exactly why it fits
here — but Cloudflare provides it as a testing convenience with no uptime
guarantee, and may rate-limit it. For one practice it is fine; if the tunnel
ever becomes unreliable, the upgrade path without changing any of this design is
a named tunnel (needs a domain, then the address stops changing) or Tailscale
Funnel (needs an account, permanent address).

## Known limitation on Vercel

`/api/public/verify-dossier` rate-limits attempts in process memory. Vercel runs
several isolated instances, so the cap is per-instance rather than global and a
determined attacker gets proportionally more attempts. The submission limits are
enforced in the database and are unaffected. Moving this counter into Postgres
is the fix.
