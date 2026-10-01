/**
 * Insurance options — exactly the desktop app's list, in the same order
 * (doctor_desktop_app_v2: src/pages/Patients.tsx and
 * api/models/dashboard_model.py INSURANCE_TYPES). The value is what both
 * apps store in `insurance_type`, so the spelling must match character for
 * character or the doctor's dashboard counts a patient under the wrong one.
 * Change all three together.
 */
export const INSURANCE_OPTIONS = [
  "Aucune assurance",
  "CNAM remboursement",
  "CNAM étatique",
  "Convention STEG",
  "Convention Tunisie Autoroutes",
  "Convention SONEDE",
  "Convention Mutuelle SONEDE",
  "Privée",
] as const;
