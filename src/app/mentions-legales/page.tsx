import type { Metadata } from "next";
import Link from "next/link";

import { LegalList, LegalPage, MailLink } from "@/components/public/legal-page";
import { PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales — DoctorY",
  description: "Éditeur, hébergement et propriété intellectuelle du site et de l'application DoctorY.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      current="/mentions-legales"
      intro={
        <p>
          Qui édite DoctorY, où le service est hébergé, et à qui appartiennent
          les contenus du site et de l&apos;application.
        </p>
      }
      sections={[
        {
          id: "editeur",
          title: "Éditeur",
          body: (
            <>
              <p>
                Le site et l&apos;application DoctorY sont édités par{" "}
                <strong>{PUBLISHER.name}</strong>, {PUBLISHER.status.toLowerCase()},{" "}
                {PUBLISHER.country}.
              </p>
              <p>
                Contact : <MailLink email={PUBLISHER.email} />
              </p>
              <p>Directeur de la publication : {PUBLISHER.name}.</p>
            </>
          ),
        },
        {
          id: "hebergement",
          title: "Hébergement",
          body: (
            <>
              <p>Le service s&apos;appuie sur les prestataires suivants :</p>
              <LegalList
                items={[
                  <>
                    <strong>Base de données et comptes</strong> : Supabase Inc.,
                    970 Toa Payoh North #07-04, Singapour 318992 — supabase.com.
                  </>,
                  <>
                    <strong>Hébergement du site</strong> : Vercel Inc., 440 N
                    Barranca Avenue #4133, Covina, CA 91723, États-Unis —
                    vercel.com.
                  </>,
                  <>
                    <strong>Protection anti-robots et connexion à distance au
                    cabinet</strong> : Cloudflare, Inc., 101 Townsend Street,
                    San Francisco, CA 94107, États-Unis — cloudflare.com.
                  </>,
                  <>
                    <strong>Distribution de l&apos;application</strong> :
                    GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco,
                    CA 94107, États-Unis — github.com.
                  </>,
                ]}
              />
              <p>
                Le dossier médical des patients n&apos;est hébergé par aucun de
                ces prestataires : il reste sur l&apos;ordinateur du cabinet
                (voir{" "}
                <Link href="/confidentialite" className="font-semibold text-primary hover:underline">
                  Confidentialité
                </Link>
                ).
              </p>
            </>
          ),
        },
        {
          id: "propriete",
          title: "Propriété intellectuelle",
          body: (
            <>
              <p>
                Le nom DoctorY, le logo, la présentation du site, ses textes,
                ainsi que l&apos;application DoctorY et son code sont la
                propriété de {PUBLISHER.name}. Toute reproduction ou
                réutilisation, totale ou partielle, sans autorisation écrite
                est interdite.
              </p>
              <p>
                Les informations des fiches (noms, adresses, horaires, tarifs,
                photos) appartiennent aux établissements qui les publient ou
                proviennent de sources publiques. Un établissement peut à tout
                moment les corriger ou demander leur retrait.
              </p>
              <p>© {new Date().getFullYear()} DoctorY — Tous droits réservés.</p>
            </>
          ),
        },
        {
          id: "sante",
          title: "Nature du service",
          body: (
            <p>
              DoctorY est un annuaire et un outil de prise de rendez-vous. Il ne
              fournit aucun avis médical, ne remplace pas une consultation et ne
              doit pas être utilisé en cas d&apos;urgence : appelez le{" "}
              <strong>SAMU au 190</strong> ou rendez-vous aux urgences les plus
              proches.
            </p>
          ),
        },
        {
          id: "signalement",
          title: "Signaler un contenu",
          body: (
            <p>
              Une fiche erronée ou un contenu illicite peut être signalé depuis
              la page{" "}
              <Link href="/signaler" className="font-semibold text-primary hover:underline">
                Signaler une erreur
              </Link>{" "}
              ou par e-mail à <MailLink email={PUBLISHER.email} />.
            </p>
          ),
        },
      ]}
    />
  );
}
