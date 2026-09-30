import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, MailLink } from "@/components/public/legal-page";
import { PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — DoctorY",
  description:
    "Les règles d'utilisation du site DoctorY : annuaire, demandes de rendez-vous, avis et espace professionnel.",
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-semibold text-primary hover:underline">
    {children}
  </Link>
);

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      current="/conditions-utilisation"
      intro={
        <p>
          Ces conditions s&apos;appliquent à toute personne qui utilise le site
          DoctorY — patient, établissement de santé ou secrétariat. En utilisant
          le site, vous les acceptez.
        </p>
      }
      sections={[
        {
          id: "service",
          title: "Le service",
          body: (
            <>
              <p>DoctorY propose, gratuitement pour les patients :</p>
              <LegalList
                items={[
                  "un annuaire de médecins, pharmacies, laboratoires, cliniques et autres établissements de santé en Tunisie, avec leurs horaires, tarifs et coordonnées ;",
                  "l'envoi de demandes de rendez-vous aux établissements qui les acceptent ;",
                  "la liste des pharmacies de garde ;",
                  "la possibilité de noter un établissement après une visite.",
                ]}
              />
              <p>
                Pour les professionnels, DoctorY propose un espace secrétariat
                et une application de gestion de cabinet, régie par sa propre{" "}
                <A href="/licence">licence</A>.
              </p>
            </>
          ),
        },
        {
          id: "urgence",
          title: "Pas un service d'urgence ni un avis médical",
          body: (
            <>
              <p>
                DoctorY ne donne aucun avis médical et ne remplace pas une
                consultation. <strong>En cas d&apos;urgence, appelez le SAMU au
                190</strong> ou rendez-vous aux urgences les plus proches.
                N&apos;utilisez jamais une demande de rendez-vous pour une
                situation urgente.
              </p>
            </>
          ),
        },
        {
          id: "rendez-vous",
          title: "Demandes de rendez-vous",
          body: (
            <>
              <p>
                Une demande envoyée depuis le site <strong>n&apos;est pas un
                rendez-vous confirmé</strong>. Elle est transmise à
                l&apos;établissement, qui l&apos;accepte, la refuse ou vous
                propose un autre horaire — en général par téléphone. Seule la
                confirmation de l&apos;établissement vaut rendez-vous.
              </p>
              <p>
                Vous vous engagez à fournir un nom et un numéro de téléphone
                exacts, et à ne faire de demande que pour vous-même ou pour une
                personne qui vous l&apos;a demandé. Les demandes répétées,
                fantaisistes ou faites au nom d&apos;un tiers sans son accord
                peuvent être bloquées.
              </p>
              <p>
                Les horaires, tarifs et disponibilités sont publiés par les
                établissements ou issus de sources publiques ; ils peuvent
                changer. En cas de doute, appelez l&apos;établissement.
              </p>
            </>
          ),
        },
        {
          id: "avis",
          title: "Avis et signalements",
          body: (
            <>
              <p>
                Seule une personne dont le rendez-vous a eu lieu peut noter un
                établissement, une fois par visite. Les notes portent sur
                l&apos;accueil, la ponctualité et les explications — jamais sur
                un diagnostic ou un traitement.
              </p>
              <p>
                Les signalements doivent être exacts et de bonne foi. Nous
                pouvons retirer toute note ou tout message abusif, diffamatoire
                ou sans lien avec une visite réelle.
              </p>
            </>
          ),
        },
        {
          id: "professionnels",
          title: "Établissements et secrétariats",
          body: (
            <>
              <p>
                Un établissement qui publie ou revendique une fiche garantit
                qu&apos;il est habilité à le faire et que les informations
                publiées sont exactes et à jour. Il reste seul responsable des
                rendez-vous qu&apos;il accepte, de ses tarifs et de sa relation
                avec ses patients.
              </p>
              <p>
                Les comptes du secrétariat sont personnels. Chacun garde son mot
                de passe secret et ne consulte les données des patients que pour
                les besoins du cabinet. L&apos;établissement est responsable du
                traitement des données de ses patients ; DoctorY agit pour son
                compte (voir <A href="/confidentialite">Confidentialité</A>).
              </p>
            </>
          ),
        },
        {
          id: "interdits",
          title: "Usages interdits",
          body: (
            <LegalList
              items={[
                "extraire massivement les fiches de l'annuaire (robots, aspiration) ;",
                "tenter d'accéder aux données d'un autre établissement ou de contourner les protections du site ;",
                "publier des contenus faux, injurieux ou portant atteinte à la vie privée d'autrui ;",
                "se faire passer pour un établissement, un professionnel ou un patient.",
              ]}
            />
          ),
        },
        {
          id: "responsabilite",
          title: "Responsabilité",
          body: (
            <>
              <p>
                Le site est fourni tel quel. Nous faisons le nécessaire pour
                qu&apos;il soit disponible et exact, sans pouvoir garantir
                l&apos;absence d&apos;interruption ou d&apos;erreur dans les
                fiches. DoctorY n&apos;est pas partie à la relation entre un
                patient et un établissement et ne peut être tenu responsable
                d&apos;un rendez-vous refusé, déplacé ou manqué, ni des soins
                reçus.
              </p>
            </>
          ),
        },
        {
          id: "donnees",
          title: "Données personnelles",
          body: (
            <p>
              Ce que nous conservons, pourquoi et pour combien de temps est
              décrit dans la page <A href="/confidentialite">Confidentialité et
              cookies</A>.
            </p>
          ),
        },
        {
          id: "modifications",
          title: "Modifications et droit applicable",
          body: (
            <>
              <p>
                Ces conditions peuvent évoluer ; la date en haut de page indique
                la dernière version. Elles sont régies par le droit tunisien.
                En cas de différend, une solution amiable sera recherchée avant
                toute action devant les tribunaux compétents de Tunis.
              </p>
              <p>
                Une question sur ces conditions : <MailLink email={PUBLISHER.email} />.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
