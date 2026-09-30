import type { Metadata } from "next";
import { Database, EyeOff, Lock, Server } from "lucide-react";

import { LegalList, LegalPage, MailLink } from "@/components/public/legal-page";
import { PUBLISHER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Confidentialité et cookies — DoctorY",
  description:
    "Ce que DoctorY conserve, ce qu'il ne voit jamais, où vivent vos données médicales, et les cookies utilisés.",
};

/**
 * The privacy page.
 *
 * Built around the one architectural fact that distinguishes this platform:
 * the clinical record never arrives here — it lives on the machine in the
 * consulting room. But it says plainly what DOES leave that machine when a
 * practice links its secretary (the administrative agenda mirror), because a
 * privacy page that overstates is worse than one that is merely short.
 */

const PILLARS = [
  {
    Icon: Server,
    title: "Le contenu médical reste au cabinet",
    body: "Notes de consultation, antécédents, traitements, analyses, ordonnances, formulaires CNAM : tout cela est enregistré par l'application installée sur l'ordinateur de votre médecin et n'a aucune place dans la base de ce site.",
  },
  {
    Icon: Database,
    title: "Ce que ce site conserve vraiment",
    body: "Ce qu'un comptoir d'accueil manipule : votre nom, votre téléphone, le motif que vous écrivez vous-même et le créneau choisi. Si le cabinet relie son secrétariat en ligne, une copie administrative de son agenda (identité, contact, assurance, rendez-vous) y est aussi tenue à jour.",
  },
  {
    Icon: EyeOff,
    title: "L'agenda public ne dit pas qui consulte",
    body: "Pour afficher les créneaux libres, le site publie uniquement des paires d'horaires occupés — un début et une fin. Aucun nom, aucun motif : impossible d'apprendre qui voit quel médecin, ni pourquoi.",
  },
  {
    Icon: Lock,
    title: "Aucun compte patient",
    body: "Il n'existe pas de compte patient sur DoctorY : pas de mot de passe à nous confier, pas de profil qui vous suit d'un établissement à l'autre, et aucun cookie publicitaire.",
  },
];

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Confidentialité et cookies"
      current="/confidentialite"
      intro={
        <p>
          DoctorY est un annuaire et une boîte de réception de rendez-vous. Ce
          n&apos;est pas un dossier médical, et il est construit pour ne jamais
          en devenir un. Cette page décrit, conformément à la loi organique
          n° 2004-63 du 27 juillet 2004 relative à la protection des données
          à caractère personnel, ce que nous traitons et pourquoi.
        </p>
      }
      sections={[
        {
          id: "responsables",
          title: "Qui est responsable de vos données",
          body: (
            <>
              <p>
                <strong>Pour une demande de rendez-vous ou un dossier de
                cabinet</strong>, le responsable est l&apos;établissement
                concerné : c&apos;est lui qui décide de l&apos;utilisation de
                vos informations. DoctorY les héberge et les transmet pour son
                compte.
              </p>
              <p>
                <strong>Pour l&apos;annuaire, les avis, les signalements et les
                comptes du secrétariat</strong>, le responsable est
                l&apos;éditeur, {PUBLISHER.name} — <MailLink email={PUBLISHER.email} />.
              </p>
            </>
          ),
        },
        {
          id: "donnees",
          title: "Les données traitées",
          body: (
            <LegalList
              items={[
                <>
                  <strong>Demande de rendez-vous</strong> : nom, prénom,
                  téléphone, sexe et âge (facultatifs), motif, créneau souhaité
                  et, si vous le donnez, votre numéro de dossier — pour que
                  l&apos;établissement puisse vous rappeler.
                </>,
                <>
                  <strong>Avis</strong> : une note de 1 à 5 étoiles (et, si vous
                  répondez, ponctualité, accueil, explications), rattachée à la
                  visite pour empêcher les faux avis. Aucun texte libre, et le
                  nom de l&apos;auteur n&apos;est jamais affiché.
                </>,
                <>
                  <strong>Signalements et avis sur le site</strong> : votre
                  message, la page concernée et, si vous le laissez, un contact
                  pour vous répondre.
                </>,
                <>
                  <strong>Comptes du secrétariat</strong> : nom, e-mail, mot de
                  passe (stocké chiffré, jamais lisible) et date de dernière
                  connexion.
                </>,
                <>
                  <strong>Copie de l&apos;agenda du cabinet</strong> (seulement
                  si le médecin relie son secrétariat) : identité, contact,
                  date de naissance, profession, assurance et numéro de dossier
                  des patients, et leurs rendez-vous — pour que le secrétariat
                  travaille quand l&apos;ordinateur du cabinet est éteint.
                  Jamais le contenu des consultations.
                </>,
                <>
                  <strong>Fiches des établissements</strong> : informations
                  professionnelles publiques (nom, adresse, horaires, tarifs,
                  photo, téléphone).
                </>,
              ]}
            />
          ),
        },
        {
          id: "acces",
          title: "Qui y a accès",
          body: (
            <>
              <p>
                Une demande n&apos;est lisible que par le secrétariat de
                l&apos;établissement choisi. Les établissements sont cloisonnés
                entre eux, et cette séparation est appliquée par la base de
                données elle-même, pas seulement par l&apos;interface.
              </p>
              <p>
                Si vous êtes déjà patient, vous pouvez indiquer votre numéro de
                dossier : le site vérifie seulement que ce numéro et votre
                téléphone vont ensemble et n&apos;obtient qu&apos;un oui ou un
                non — jamais le contenu du dossier.
              </p>
              <p>
                Les signalements et avis sur le site ne sont lus que par
                l&apos;équipe qui maintient l&apos;annuaire. Nous ne vendons ni
                ne louons aucune donnée.
              </p>
            </>
          ),
        },
        {
          id: "conservation",
          title: "Durée de conservation",
          body: (
            <LegalList
              items={[
                "Demandes de rendez-vous : le temps nécessaire à l'établissement pour les traiter et assurer le suivi des visites ; supprimées sur demande de l'établissement ou de la personne concernée.",
                "Copie de l'agenda : remplacée à chaque synchronisation ; supprimée lorsque le cabinet déconnecte son secrétariat ou quitte DoctorY.",
                "Comptes du secrétariat : jusqu'à leur suppression, possible à tout moment depuis la page Profil.",
                "Signalements et avis sur le site : le temps de les traiter, puis supprimés ou anonymisés.",
              ]}
            />
          ),
        },
        {
          id: "prestataires",
          title: "Prestataires et hébergement",
          body: (
            <>
              <p>
                Pour fonctionner, DoctorY s&apos;appuie sur des prestataires qui
                n&apos;utilisent les données que pour rendre leur service :
              </p>
              <LegalList
                items={[
                  "Supabase — base de données et comptes ;",
                  "Vercel — hébergement du site ;",
                  "Cloudflare — protection anti-robots des formulaires (Turnstile) et connexion sécurisée entre le site et l'ordinateur du cabinet ;",
                  "Google Maps — carte d'un établissement, uniquement si vous cliquez pour l'afficher ;",
                  "OpenStreetMap — carte sur certaines fiches, sans cookie ni traceur ;",
                  "GitHub — téléchargement de l'application.",
                ]}
              />
              <p>
                Ces prestataires peuvent héberger des données hors de Tunisie.
                Le contenu médical des consultations, lui, ne quitte jamais
                l&apos;ordinateur du cabinet.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies et stockage local",
          body: (
            <>
              <p>
                DoctorY n&apos;utilise <strong>aucun cookie publicitaire ni
                outil de mesure d&apos;audience</strong>. Seuls sont déposés :
              </p>
              <LegalList
                items={[
                  "les cookies de connexion du secrétariat (espace professionnel uniquement), indispensables pour rester connecté ;",
                  "le contrôle anti-robots de Cloudflare sur les formulaires, indispensable à leur sécurité ;",
                  "de petites préférences d'affichage enregistrées dans votre navigateur (par exemple le menu replié), qui ne quittent pas votre appareil.",
                ]}
              />
              <p>
                Ces éléments étant strictement nécessaires, ils ne demandent pas
                de consentement. La carte Google Maps, qui pourrait déposer ses
                propres cookies, ne se charge que lorsque vous cliquez sur
                « Afficher la carte ».
              </p>
            </>
          ),
        },
        {
          id: "securite",
          title: "Sécurité",
          body: (
            <p>
              Les échanges sont chiffrés (HTTPS), les mots de passe ne sont
              jamais stockés en clair, et chaque établissement ne peut accéder
              qu&apos;à ses propres données. La liaison entre le site et
              l&apos;ordinateur du cabinet passe par un tunnel chiffré et
              n&apos;expose que ce dont le secrétariat a besoin.
            </p>
          ),
        },
        {
          id: "droits",
          title: "Vos droits",
          body: (
            <>
              <p>
                Vous pouvez accéder aux informations vous concernant, les faire
                rectifier, vous opposer à leur traitement ou demander leur
                suppression. Écrivez à <MailLink email={PUBLISHER.email} /> ;
                nous répondons dans un délai d&apos;un mois. Pour votre dossier
                médical, l&apos;interlocuteur est votre médecin : il en est le
                seul détenteur.
              </p>
              <p>
                Vous pouvez aussi saisir l&apos;Instance nationale de protection
                des données personnelles (INPDP) —{" "}
                <a
                  href="https://www.inpdp.nat.tn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  inpdp.nat.tn
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-border-warm bg-card p-5 shadow-card"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[1.02rem] font-bold">{title}</h2>
              <p className="text-[0.9rem] leading-relaxed text-foreground/75">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </LegalPage>
  );
}
