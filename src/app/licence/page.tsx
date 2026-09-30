import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, MailLink } from "@/components/public/legal-page";
import { PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Licence de l'application — DoctorY",
  description:
    "Conditions de licence de l'application DoctorY pour Windows : clé de licence, données du cabinet, responsabilités, mises à jour et remboursement.",
};

/**
 * The desktop app's end-user licence. The same text ships inside the
 * installer (doctor_desktop_app_v2/src-tauri/LICENSE.txt) — change both
 * together.
 */
export default function LicencePage() {
  return (
    <LegalPage
      title="Licence de l'application DoctorY"
      current="/licence"
      intro={
        <p>
          Ce contrat encadre l&apos;utilisation de l&apos;application DoctorY
          pour Windows entre {PUBLISHER.name} (« l&apos;éditeur ») et le
          professionnel de santé ou le cabinet qui l&apos;installe
          (« l&apos;utilisateur »). Installer ou utiliser l&apos;application
          vaut acceptation de ces conditions.
        </p>
      }
      sections={[
        {
          id: "licence",
          title: "Licence accordée",
          body: (
            <>
              <p>
                L&apos;éditeur accorde à l&apos;utilisateur une licence
                d&apos;utilisation <strong>personnelle, non exclusive et non
                transférable</strong>, pour les besoins de son propre cabinet,
                pendant la durée associée à sa clé de licence.
              </p>
              <p>
                L&apos;application reste la propriété de l&apos;éditeur. Elle
                est concédée, pas vendue. Il est interdit de la copier pour la
                distribuer, de la revendre, de la louer, de la décompiler, de la
                modifier ou de contourner la vérification de licence.
              </p>
            </>
          ),
        },
        {
          id: "cle",
          title: "Clé de licence",
          body: (
            <>
              <p>
                Chaque clé est remise nominativement et peut être activée sur un
                nombre limité d&apos;ordinateurs, précisé à sa remise. Une
                connexion internet est nécessaire pour la première activation ;
                ensuite l&apos;application fonctionne hors ligne.
              </p>
              <p>
                Pour vérifier la clé, l&apos;application transmet
                l&apos;identifiant de la clé, une empreinte technique anonyme de
                l&apos;ordinateur et son nom réseau. Aucune donnée de patient
                n&apos;est transmise lors de cette vérification.
              </p>
              <p>
                Une clé peut être suspendue ou révoquée en cas de non-paiement,
                de partage au-delà du nombre d&apos;ordinateurs autorisés ou de
                violation de ce contrat. Pour changer d&apos;ordinateur,
                contactez l&apos;éditeur, qui libère l&apos;ancien poste.
              </p>
            </>
          ),
        },
        {
          id: "donnees",
          title: "Données du cabinet",
          body: (
            <>
              <p>
                Les dossiers des patients sont enregistrés <strong>sur
                l&apos;ordinateur du cabinet</strong>. L&apos;utilisateur est
                le responsable du traitement de ces données au sens de la loi
                organique n° 2004-63 du 27 juillet 2004 : il lui appartient
                notamment de respecter le secret médical, de protéger
                l&apos;accès à son poste et d&apos;accomplir les formalités
                auprès de l&apos;Instance nationale de protection des données
                personnelles (INPDP).
              </p>
              <p>
                <strong>Les sauvegardes sont sous la responsabilité de
                l&apos;utilisateur.</strong> L&apos;éditeur recommande une copie
                régulière des données sur un support externe, notamment avant
                chaque mise à jour.
              </p>
              <p>
                Si l&apos;utilisateur active la liaison avec le secrétariat en
                ligne, l&apos;application transmet au site DoctorY les données
                administratives nécessaires à l&apos;agenda (identité, contact,
                assurance, rendez-vous), jamais le contenu médical des
                consultations. L&apos;éditeur agit alors comme sous-traitant,
                pour le compte de l&apos;utilisateur et selon ses instructions
                (voir <Link href="/confidentialite" className="font-semibold text-primary hover:underline">Confidentialité</Link>).
              </p>
            </>
          ),
        },
        {
          id: "usage-medical",
          title: "Usage médical",
          body: (
            <p>
              DoctorY est un outil de gestion. Il ne pose aucun diagnostic et ne
              remplace pas le jugement du médecin. Les suggestions (noms de
              médicaments, posologies, modèles de documents) sont une aide à la
              saisie : l&apos;utilisateur vérifie chaque ordonnance, certificat
              ou formulaire avant de le signer et de le remettre.
            </p>
          ),
        },
        {
          id: "mises-a-jour",
          title: "Mises à jour et assistance",
          body: (
            <>
              <p>
                Les nouvelles versions sont publiées sur la page{" "}
                <Link href="/telecharger" className="font-semibold text-primary hover:underline">
                  Télécharger
                </Link>{" "}
                et s&apos;installent par-dessus la version existante, sans
                perte de données. L&apos;utilisateur choisit le moment de la
                mise à jour.
              </p>
              <p>
                Assistance : <MailLink email={PUBLISHER.email} />, dans un délai
                raisonnable, les jours ouvrables.
              </p>
            </>
          ),
        },
        {
          id: "garantie",
          title: "Garantie et responsabilité",
          body: (
            <>
              <p>
                L&apos;application est fournie « en l&apos;état ».
                L&apos;éditeur s&apos;efforce de corriger rapidement les
                anomalies signalées, sans garantir un fonctionnement exempt
                d&apos;erreur.
              </p>
              <p>
                Dans les limites permises par la loi, la responsabilité de
                l&apos;éditeur est limitée aux dommages directs et plafonnée au
                montant payé par l&apos;utilisateur au cours des douze derniers
                mois. L&apos;éditeur n&apos;est pas responsable d&apos;une perte
                de données due à l&apos;absence de sauvegarde, à une panne du
                matériel ou à une mauvaise utilisation.
              </p>
            </>
          ),
        },
        {
          id: "prix",
          title: "Prix, paiement et remboursement",
          body: (
            <>
              <p>
                Le prix, la durée et le nombre d&apos;ordinateurs sont convenus
                lors de la remise de la clé. La clé est activée après paiement.
              </p>
              <LegalList
                items={[
                  <>
                    <strong>Clé jamais activée</strong> : remboursement intégral
                    sur demande dans les 14 jours suivant la remise.
                  </>,
                  <>
                    <strong>Application inutilisable</strong> sur un ordinateur
                    conforme à la configuration requise, sans solution trouvée
                    par l&apos;assistance dans les 14 jours suivant le
                    signalement : remboursement de la période non utilisée.
                  </>,
                  "Aucun remboursement après révocation pour violation de ce contrat.",
                ]}
              />
              <p>
                Demande de remboursement : <MailLink email={PUBLISHER.email} />.
              </p>
            </>
          ),
        },
        {
          id: "fin",
          title: "Fin du contrat",
          body: (
            <p>
              L&apos;utilisateur peut cesser d&apos;utiliser l&apos;application
              à tout moment. À l&apos;expiration ou à la révocation de la clé,
              l&apos;application ne s&apos;ouvre plus, mais les données restent
              sur l&apos;ordinateur du cabinet : sur demande, l&apos;éditeur
              aide l&apos;utilisateur à les exporter.
            </p>
          ),
        },
        {
          id: "droit",
          title: "Droit applicable",
          body: (
            <p>
              Ce contrat est régi par le droit tunisien. En cas de différend, les
              parties recherchent d&apos;abord une solution amiable ; à défaut,
              les tribunaux compétents de Tunis sont saisis.
            </p>
          ),
        },
      ]}
    />
  );
}
