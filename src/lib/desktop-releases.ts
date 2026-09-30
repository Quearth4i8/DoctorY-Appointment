/**
 * The DoctorY desktop app's published versions — the one list the home page,
 * /telecharger and /api/public/desktop/latest all read.
 *
 * Publishing a new version:
 *   1. `npm run release` in doctor_desktop_app_v2 builds
 *      src-tauri/target/release/bundle/nsis/DoctorY_<version>_x64-setup.exe
 *   2. Upload that file as a release asset tagged v<version> on the PUBLIC
 *      downloads repository (DOWNLOAD_REPO below). The source repository is
 *      private, and a private repo's release files cannot be downloaded by a
 *      doctor who is not signed in to GitHub.
 *   3. Add an entry at the TOP of RELEASES with the date, size and notes.
 *
 * The app refuses to open without a licence key, so the installer itself is
 * safe to publish openly.
 */

/** Public GitHub repository that holds only the installers. */
export const DOWNLOAD_REPO = "Quearth4i8/DoctorY-releases";

export type DesktopRelease = {
  version: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Installer size in megabytes, as shown on the button. */
  sizeMb: number;
  /** One short line on what the version is about. */
  title: string;
  notes: string[];
  /** False for versions kept in the changelog but no longer offered. */
  downloadable: boolean;
};

export const RELEASES: DesktopRelease[] = [
  {
    version: "2.3.7",
    date: "2026-09-30",
    sizeMb: 86,
    title: "Licences plus fiables",
    notes: [
      "La licence est vérifiée à chaque ouverture, en arrière-plan : aucune attente, même hors connexion.",
      "Une licence révoquée ou supprimée est prise en compte en quelques minutes.",
      "Une licence réactivée débloque l'application toute seule, sans ressaisir la clé.",
    ],
    downloadable: true,
  },
  {
    version: "2.3.6",
    date: "2026-09-26",
    sizeMb: 86,
    title: "Dossier patient et impression sur papier pré-imprimé",
    notes: [
      "Génération du dossier patient complet en un clic.",
      "Impression des ordonnances et documents sur votre papier à en-tête déjà imprimé.",
      "Guide d'utilisation intégré à l'application.",
      "Signalement d'erreur depuis l'application.",
    ],
    downloadable: true,
  },
  {
    version: "2.3.0",
    date: "2026-09-02",
    sizeMb: 80,
    title: "Accès à distance et analyses de laboratoire",
    notes: [
      "Le secrétariat gère l'agenda depuis le site, synchronisé avec le cabinet.",
      "Analyses de laboratoire et consultations repensées.",
      "Formulaires CNAM (BS, AP1, APCI) intégrés au dossier du patient.",
      "Suggestions de médicaments et durée de traitement dans l'ordonnance.",
    ],
    downloadable: false,
  },
  {
    version: "2.2.0",
    date: "2026-08-01",
    sizeMb: 79,
    title: "Certificats et bilans",
    notes: [
      "Certificat médical et bilan de retentissement.",
      "Lettres aux confrères depuis la consultation.",
    ],
    downloadable: false,
  },
  {
    version: "2.1.0",
    date: "2026-07-20",
    sizeMb: 48,
    title: "Examens et rendez-vous",
    notes: [
      "Prescriptions d'examens liées aux examens cliniques.",
      "Gestion des rendez-vous améliorée.",
    ],
    downloadable: false,
  },
];

export const LATEST_RELEASE = RELEASES[0];

export function installerName(version: string): string {
  return `DoctorY_${version}_x64-setup.exe`;
}

export function downloadUrl(release: DesktopRelease): string {
  return `https://github.com/${DOWNLOAD_REPO}/releases/download/v${release.version}/${installerName(release.version)}`;
}

export function formatReleaseDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
