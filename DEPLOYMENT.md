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

## Several doctors, one installer

Each desktop installation generates its own **clé de liaison** and identifies
itself with it. The same build ships to every doctor: nothing is compiled per
practice, and no slug or id is configured anywhere.

```
Doctor installs the app          Secretary, once                 Every request
────────────────────────         ───────────────                 ────────────
key generated automatically  →   pastes it in Paramètres     →   site resolves
app opens a quick tunnel         (binds key ↔ her doctor)        that doctor's
publishes its address                                            address + key
using that key
```

## 1. The doctor

Installs the app. That is the whole setup.

To hand over his key: **Paramètres → Application du médecin** in the desktop app,
or read `remote_api_token` from `app_settings.json`. He sends it to his
secretary once and never again — the address may change on every reboot, the key
does not.

**What must ship in the installer:** `cloudflared.exe` beside `server.exe` (or
anywhere on PATH). Download it from
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
Without it the app still works locally; only the website loses the connection.

**What each installation needs in `app_settings.json`** so it knows where to
publish — the same two values for every doctor, so they can be shipped with the
build:

```json
{
  "supabase_url": "https://hfoibsulsziwqhlcmftw.supabase.co",
  "supabase_anon_key": "<anon key>"
}
```

## 2. The secretary

Paramètres → **Application du médecin** → paste the key → **Lier**.

The card then shows *Connectée* with the last time the app announced itself. She
never sees an address and never touches a config file.

Binding is restricted to the doctor she works for (`staff.doctor_id`), so she
cannot re-point another practice at a key she controls.

## 3. On Vercel

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hfoibsulsziwqhlcmftw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key |
| `SERVER_API_SECRET` | any long random string — see below |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | real key from the Turnstile dashboard |
| `TURNSTILE_SECRET_KEY` | real secret — **not** `NEXT_PUBLIC_` |
| `IP_HASH_SALT` | any long random string |

Register the same secret in Supabase once:

```sql
select public.set_app_secret('server_api_secret', '<same value>');
```

That is what lets the server read each practice's key through
`get_doctor_endpoint()`. It is deliberately not a service-role key: if it leaks,
the damage is limited to endpoint credentials rather than the whole database.

Leave `DOCTOR_API_URL` and `DOCTOR_API_TOKEN` **unset** in production. Setting
them pins the whole site to one backend, which is exactly what breaks with more
than one doctor.

Add the Vercel domain to the Turnstile site's hostnames, or every submission is
refused.

## 4. Check it

Find what each practice published:

```sql
select slug, remote_api_url, remote_seen_at,
       remote_token <> '' as paired
from public.doctors;
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
