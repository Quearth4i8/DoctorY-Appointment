/**
 * Screenshots of the DoctorY desktop app, taken from the user guide's demo
 * practice (doctor_desktop_app_v2/scripts/guide/shots, never a real doctor's
 * data).
 *
 * They live in a dated folder because Next's image optimizer — and Vercel's
 * cache in front of it — keep serving a picture by its URL: a file replaced
 * under the same name goes on showing the old screen. To refresh them, copy
 * the new shots into a new public/app/<date>/ folder and change the date here.
 */
const APP_SCREENS = "/app/2026-10-08";

export type AppScreen =
  | "tableau-de-bord"
  | "patients"
  | "consultations"
  | "analyses"
  | "exploration"
  | "rendez-vous"
  | "formulaires";

export function appScreen(name: AppScreen): string {
  return `${APP_SCREENS}/${name}.jpg`;
}
