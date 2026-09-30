/**
 * Who publishes DoctorY, in one place for every legal page, the footer and
 * the desktop licence. Update here when the project becomes a company (name,
 * legal form, matricule fiscal, registered address).
 */
export const PUBLISHER = {
  name: "Mohamed Aziz Bjaoui",
  status: "Personne physique — projet indépendant, en cours de structuration",
  email: "bojbojazaz@gmail.com",
  country: "Tunisie",
} as const;

/** Shown at the top of every legal page. Bump when a text changes. */
export const LEGAL_UPDATED = "2026-09-30";

export const LEGAL_PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions-utilisation", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Confidentialité et cookies" },
  { href: "/licence", label: "Licence de l'application" },
] as const;

export function formatLegalDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
