# Agenda du cabinet — Appointment app (secretary)

A weekly scheduler for the doctor's secretary, plus a public "request an
appointment" channel. It is a thin, **privacy-restricted front-end over the
doctor's desktop app**: the medical record stays in the doctor's local SQLite
database and never moves.

## Architecture

```
Secretary (signed in, from anywhere)
        │
        ▼
  this Next.js app ──► Supabase  (auth + public RDV requests only)
        │
        └──► /api proxy ──► Doctor's local API (FastAPI :8765) ──► doctor.db
                                      ▲
Public patient ──► /demande ──► Supabase ──┘  (desktop app pulls accepted requests)
```

Two data planes, deliberately kept apart:

- **Supabase** holds only what has to be reachable from the internet: the staff
  logins and the queue of appointment requests submitted by the public. No
  medical data is ever written there.
- **doctor.db** stays the system of record. Once the secretary accepts a
  request, the doctor's desktop app pulls it in and stamps the local patient /
  appointment ids back onto the Supabase row.

Access rules:

- Every route except `/login`, `/demande` and `/api/public/*` requires a session
  (`src/middleware.ts`), **and** every route that touches doctor.db additionally
  requires the user to be in the `staff` table (`handleStaff` in
  `src/lib/api-response.ts`). A Supabase account alone is not enough.
- The proxy into doctor.db is a strict allowlist: only patients (list, create,
  administrative update) and appointments. Consultations, exams, documents, CNAM
  forms, metrics and profile are unreachable, and patient payloads are trimmed
  to identity + contact + administrative fields (`src/lib/doctor-api.ts`).
  Clinical fields — notes, blood group, habits, treatments, referrer — are
  dropped at the proxy and never reach this app.
- **Patients can be added and edited here, never deleted.** Deleting a patient
  in doctor.db cascades through their consultations, exams, documents and CNAM
  forms, so it stays an action only the doctor can take from the desktop app.
  Edits go to `PATCH /api/patients/{id}/admin` on the doctor's API, which writes
  only the administrative columns — the plain `PUT /api/patients/{id}` rewrites
  every column and would null out the clinical fields this app cannot see.
- In Supabase, Row Level Security lets anonymous visitors **insert** a pending
  request and nothing else — they cannot read the table back, and cannot set the
  review or sync columns (`supabase/migrations/`).

## Setup

### 1. Supabase (project `hfoibsulsziwqhlcmftw`)

1. **Run the migration.** Dashboard → SQL Editor → paste
   `supabase/migrations/20260731000000_init.sql` → Run.
2. **Turn off public sign-ups.** Authentication → Sign In / Providers → disable
   "Allow new users to sign up". Staff accounts are created by hand.
3. **Create the secretary's account.** Authentication → Users → Add user (email
   + password, "Auto Confirm User" checked).
4. **Add them to the allowlist.** SQL Editor:

   ```sql
   insert into public.staff (user_id, role, full_name)
   values ('<the user uuid>', 'secretary', 'Nom de la secrétaire');
   ```

### 2. Environment

Copy `.env.example` to `.env` and fill in — Dashboard → Project Settings → API:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | already set to the project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key (safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key — **server only** |
| `DESKTOP_SYNC_TOKEN` | a secret you generate; the desktop app sends it back |
| `DOCTOR_API_URL` | the doctor's FastAPI, default `http://127.0.0.1:8765` |

`.env*` is git-ignored. The service role key bypasses RLS — it must never be
prefixed with `NEXT_PUBLIC_` or imported outside `src/lib/supabase/admin.ts`.

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you land on `/login`.

> The scheduler still talks to the doctor's PC over `DOCTOR_API_URL`. Booking
> from outside the clinic works for the **request queue** (that lives in
> Supabase); the week grid itself needs the doctor's machine reachable.

## Using it

After signing in the secretary lands on a home screen with two sections.

### Agenda & rendez-vous (`/agenda`)

- **Week grid** with morning→evening slots, Monday–Sunday.
- **Click an empty slot** to create an appointment (search an existing patient or
  add a new one on the spot).
- **Drag an appointment** to another time/day to reschedule it.
- **Click an appointment** to confirm it, mark it as done, cancel, or delete.
- The view refreshes on its own, so edits made in the doctor's desktop app
  appear here automatically.

### Patients (`/patients`)

- **Search** by name, phone, job, email or numéro de dossier; an empty search
  lists everyone, newest first.
- **Add a patient** with their identity, contact and administrative details.
  A same-name patient triggers a confirmation before creating a duplicate.
- **Edit a patient**: name, father's name, phone, sex, age, date of birth, job,
  email, address, insurance and numéro de dossier. Leaving the numéro blank
  keeps the current one — it is never cleared by an edit.
- There is **no delete** here by design (see above).

Everything written here goes straight into `doctor.db`, so it is already there
the next time the doctor opens the desktop app.
