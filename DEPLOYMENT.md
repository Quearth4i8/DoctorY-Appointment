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

**Nothing to configure per machine.** The Supabase URL and anon key are
compiled into the app (`api/utils/tunnel.py`). The anon key is meant to be
public — it already ships inside the website's JavaScript — and grants nothing
on its own, since every table is behind Row Level Security. Override them per
machine via `app_settings.json` or the environment only if you need to point an
installation at a different project.

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

Nothing. That is the point of the design, and it is worth understanding why.

The website used to proxy every request through to the doctor's machine, so the
secretary could not do her job while he was asleep. Patients and appointments
now live in Supabase, which she can always reach, and his app reconciles with it
whenever it connects — in either direction, after any length of silence.

What makes that safe is that **every row has exactly one writer**:

| | Written by | Reconciled how |
| --- | --- | --- |
| Appointments | the secretary, always | his app copies them down; it never creates one |
| Clinical record | the doctor, always | never leaves `doctor.db` |
| Patient admin fields | either side | her edit sets `pending_edit`; his app applies it and clears the flag |
| `numero_dossier` | the doctor's app, always | she may suggest one; his app keeps it if free, reassigns it if not |

With one writer per row there is nothing to merge and no conflict to resolve.

### File numbers

A patient she registers has **no file number until his app next syncs** — only
`doctor.db` knows which numbers have ever been issued, and inventing one here
would collide with a real dossier. The website shows "N° en attente" for those,
which is honest and does not stop her booking them an appointment.

If she does type a number, his app keeps it when it is free and issues the next
free one when it is not, then sends the final value back.

### Double-booking

The 30-minute rule is a Postgres exclusion constraint
(`appointments_min_gap`), not application code. Two ranges `[s, s+30)` and
`[t, t+30)` overlap exactly when `|s - t| < 30 min`, which is the same test
`AppointmentModel._ensure_constraints` does in SQLite — so the two agree, and a
booking accepted online can never be rejected on the doctor's machine. Being in
the schema means it holds even with two tabs open or two people booking at once.

### The doctor's agenda is read-only

His Appointments page shows the day and does not change it. If he wants an
appointment he asks his secretary. This is not a limitation to work around: two
writers on one agenda, out of touch with each other, is precisely how a slot
gets sold twice.

### The first sync

Appointments that already existed in `doctor.db` are lifted up once
(`desk_seed_appointments`), after which the website owns them. Rows too close
together to satisfy the 30-minute rule are skipped and counted in the log rather
than aborting the batch — an old database can already contain them.

### Is the tunnel still needed?

For the day-to-day, no: the website no longer calls the doctor's PC at all. The
tunnel and the two-port scheme remain in place and still work, and the pairing
key is still what authenticates his app to Supabase — but nothing on the
critical path depends on a quick tunnel staying up any more.

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
