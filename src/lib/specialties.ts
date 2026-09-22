/**
 * Common medical specialties, in the French wording used on Tunisian plaques.
 *
 * Suggestions, not a taxonomy. The canonical list lives in the `specialties`
 * table and is what search and filtering are built on; this exists only so the
 * client-side forms — which cannot reach the database — can offer something
 * better than an empty box. Every picker fed by this one accepts free text,
 * so a specialty missing here is typed, not blocked.
 */
/** Specialty name → extra words that should also match when searching. */
const SPECIALTY_KEYWORDS: Record<string, string> = {
  "Médecine générale": "généraliste omnipraticien famille",
  "Cardiologie": "cardiologue coeur cœur cardiaque",
  "Dermatologie": "dermatologue peau",
  "Gynécologie-obstétrique": "gynécologue obstétricien femme grossesse accouchement",
  "Pédiatrie": "pédiatre enfant bébé nourrisson",
  "Ophtalmologie": "ophtalmologue yeux vue oeil œil",
  "Oto-rhino-laryngologie": "orl oreille nez gorge",
  "Stomatologie": "dentiste dents bouche",
  "Chirurgie dentaire": "dentiste dents odontologie",
  "Psychiatrie": "psychiatre santé mentale",
  "Neurologie": "neurologue nerfs cerveau",
  "Neurochirurgie": "neurochirurgien cerveau colonne",
  "Gastro-entérologie": "gastro estomac intestin digestif hépatologie",
  "Endocrinologie": "endocrinologue diabète thyroïde hormones",
  "Néphrologie": "néphrologue rein dialyse",
  "Pneumologie": "pneumologue poumon respiratoire asthme",
  "Rhumatologie": "rhumatologue articulations os",
  "Urologie": "urologue prostate rein vessie",
  "Orthopédie": "orthopédiste os fracture traumatologie",
  "Chirurgie générale": "chirurgien",
  "Chirurgie plastique": "esthétique reconstructrice",
  "Chirurgie cardiovasculaire": "coeur cœur vasculaire",
  "Anesthésie-réanimation": "anesthésiste réanimateur",
  "Radiologie": "radiologue imagerie scanner irm échographie",
  "Oncologie": "oncologue cancer carcinologie",
  "Hématologie": "hématologue sang",
  "Allergologie": "allergologue allergie",
  "Diabétologie": "diabète",
  "Médecine du travail": "travail",
  "Médecine physique et réadaptation": "rééducation kinésithérapie physiothérapie",
  "Médecine interne": "interniste",
  "Médecine esthétique": "esthétique",
  "Gériatrie": "gériatre personnes âgées",
  "Infectiologie": "maladies infectieuses",
  "Angiologie": "veines varices vasculaire",
  "Phlébologie": "veines varices",
  "Andrologie": "fertilité masculine",
  "Nutrition": "nutritionniste diététique régime",
  "Psychologie": "psychologue thérapie",
  "Orthophonie": "orthophoniste langage parole",
  "Kinésithérapie": "kinésithérapeute physiothérapie rééducation",
  "Sage-femme": "accouchement grossesse maternité",
  "Biologie médicale": "laboratoire analyses biologiste",
  "Anatomie pathologique": "anapath biopsie",
  "Médecine nucléaire": "scintigraphie",
  "Génétique médicale": "génétique",
  "Chirurgie pédiatrique": "enfant chirurgie",
  "Chirurgie maxillo-faciale": "mâchoire visage",
  "Chirurgie thoracique": "thorax poumon",
  "Chirurgie vasculaire": "vaisseaux artères",
  "Acupuncture": "médecine douce",
  "Ostéopathie": "ostéopathe manipulation",
};

/** The suggestions, as combobox options with their hidden search words. */
export const SPECIALTY_OPTIONS: {
  value: string;
  label: string;
  keywords: string;
}[] = Object.entries(SPECIALTY_KEYWORDS)
  .map(([label, keywords]) => ({ value: label, label, keywords }))
  .sort((a, b) => a.label.localeCompare(b.label, "fr"));
