import {
  Activity,
  Baby,
  Building2,
  Cross,
  Eye,
  FlaskConical,
  Glasses,
  HeartPulse,
  Hospital,
  Pill,
  Scan,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import { PROVIDER_KIND_LABELS, type ProviderKind } from "@/types";

/**
 * How each trade is drawn, and which of the semantic colours it borrows.
 *
 * Deliberately not twelve distinct hues. Twelve colours carry no meaning a
 * reader can hold, and a results page mixing all of them reads as noise. The
 * kinds are grouped into four families instead — care, retail, analysis,
 * home visit — so colour says "what sort of place is this" and the icon says
 * which one. The palette entries are token classes, never literals, so both
 * themes follow.
 */
export type KindMeta = {
  label: string;
  /** Plural, for category tiles and filter labels. */
  plural: string;
  /** One line on the catalogue page — what you actually go there for. */
  blurb: string;
  Icon: LucideIcon;
  /** Tailwind classes for a tinted icon chip. */
  chip: string;
  /** Tailwind class for the icon glyph inside that chip. */
  glyph: string;
};

/**
 * How the twelve trades are grouped on /annuaire.
 *
 * By what a visitor came to do, not by anything administrative — someone
 * needing blood work does not think "biologie médicale", they think "I have a
 * prescription for analyses".
 */
export const KIND_GROUPS: { title: string; note: string; kinds: ProviderKind[] }[] = [
  {
    title: "Praticiens",
    note: "Consulter quelqu'un, au cabinet ou chez vous.",
    kinds: ["medecin", "dentiste", "sage_femme", "kinesitherapie", "infirmier"],
  },
  {
    title: "Cliniques & hôpitaux",
    note: "Plusieurs spécialités au même endroit, et les urgences.",
    kinds: ["clinique", "hopital"],
  },
  {
    title: "Analyses & imagerie",
    note: "Ce qu'une ordonnance vous envoie faire.",
    kinds: ["laboratoire", "imagerie"],
  },
  {
    title: "Pharmacies & équipement",
    note: "Sans rendez-vous — horaires, gardes et itinéraire.",
    kinds: ["pharmacie", "parapharmacie", "opticien"],
  },
];

const CARE = { chip: "bg-primary-soft", glyph: "text-primary-soft-foreground" };
const RETAIL = { chip: "bg-info-soft", glyph: "text-info-foreground" };
const ANALYSIS = { chip: "bg-lab-soft", glyph: "text-lab-foreground" };
const VISIT = { chip: "bg-warn-soft", glyph: "text-warn-foreground" };

export const KIND_META: Record<ProviderKind, KindMeta> = {
  medecin: { blurb: "Généralistes et spécialistes en cabinet privé.", label: PROVIDER_KIND_LABELS.medecin, plural: "Médecins", Icon: Stethoscope, ...CARE },
  clinique: { blurb: "Polycliniques et cliniques, plusieurs praticiens.", label: PROVIDER_KIND_LABELS.clinique, plural: "Cliniques", Icon: Hospital, ...CARE },
  hopital: { blurb: "Hôpitaux publics et leurs services.", label: PROVIDER_KIND_LABELS.hopital, plural: "Hôpitaux", Icon: Building2, ...CARE },
  dentiste: { blurb: "Chirurgiens-dentistes et orthodontistes.", label: PROVIDER_KIND_LABELS.dentiste, plural: "Dentistes", Icon: Activity, ...CARE },
  sage_femme: { blurb: "Suivi de grossesse et préparation.", label: PROVIDER_KIND_LABELS.sage_femme, plural: "Sages-femmes", Icon: Baby, ...CARE },

  pharmacie: { blurb: "Officines, horaires et tours de garde.", label: PROVIDER_KIND_LABELS.pharmacie, plural: "Pharmacies", Icon: Cross, ...RETAIL },
  parapharmacie: { blurb: "Cosmétique, hygiène et compléments.", label: PROVIDER_KIND_LABELS.parapharmacie, plural: "Parapharmacies", Icon: Pill, ...RETAIL },
  opticien: { blurb: "Lunettes, lentilles et examens de vue.", label: PROVIDER_KIND_LABELS.opticien, plural: "Opticiens", Icon: Glasses, ...RETAIL },

  laboratoire: { blurb: "Analyses médicales et prélèvement à domicile.", label: PROVIDER_KIND_LABELS.laboratoire, plural: "Laboratoires", Icon: FlaskConical, ...ANALYSIS },
  imagerie: { blurb: "Radiologie, scanner, IRM et échographie.", label: PROVIDER_KIND_LABELS.imagerie, plural: "Imagerie", Icon: Scan, ...ANALYSIS },

  kinesitherapie: { blurb: "Rééducation, au cabinet ou à domicile.", label: PROVIDER_KIND_LABELS.kinesitherapie, plural: "Kinésithérapie", Icon: HeartPulse, ...VISIT },
  infirmier: { blurb: "Soins et injections à domicile.", label: PROVIDER_KIND_LABELS.infirmier, plural: "Infirmiers", Icon: Syringe, ...VISIT },
};

/** The order categories are offered in — most-searched first, not alphabetical. */
export const KIND_ORDER: ProviderKind[] = [
  "medecin",
  "pharmacie",
  "laboratoire",
  "clinique",
  "dentiste",
  "hopital",
  "imagerie",
  "parapharmacie",
  "opticien",
  "kinesitherapie",
  "infirmier",
  "sage_femme",
];

/** The kinds the search bar offers as quick tabs. The rest live in filters. */
export const KIND_TABS: ProviderKind[] = [
  "medecin",
  "pharmacie",
  "laboratoire",
  "clinique",
];

export const kindMeta = (kind: ProviderKind): KindMeta =>
  KIND_META[kind] ?? KIND_META.medecin;

/**
 * What the primary action on a card should say.
 *
 * Driven by booking mode rather than by trade, because the two come apart:
 * a laboratory that pairs a machine really can offer a time, and a cabinet
 * that has not cannot. Promising "Réserver" where no agenda exists is the
 * one thing this must never do.
 */
export function primaryAction(mode: string): { label: string; href: "book" | "request" | "directions" } {
  if (mode === "agenda") return { label: "Réserver", href: "book" };
  if (mode === "demande") return { label: "Demander", href: "request" };
  return { label: "Itinéraire", href: "directions" };
}

export { PROVIDER_KIND_LABELS };
