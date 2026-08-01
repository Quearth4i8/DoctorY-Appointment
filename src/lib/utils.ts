import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * How a patient's file number reads in a list.
 *
 * Blank means the doctor's app has not taken the patient in yet, which happens
 * whenever the secretary registers someone while his PC is off. Saying so is
 * better than an empty space she cannot interpret — and much better than
 * inventing a number, which would collide with a real dossier.
 */
export function dossierLabel(patient: {
  numero_dossier: string;
  registered: boolean;
}): string {
  if (patient.numero_dossier) return `N° ${patient.numero_dossier}`;
  return patient.registered ? "" : "N° en attente";
}
