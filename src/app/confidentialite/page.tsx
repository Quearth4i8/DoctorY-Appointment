import type { Metadata } from "next";
import { Database, EyeOff, Lock, Server } from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";

export const metadata: Metadata = {
  title: "Confidentialité",
  description:
    "Ce que DoctorY conserve, ce qu'il ne voit jamais, et où vivent vos données médicales.",
};

/**
 * The privacy page.
 *
 * Written around the one architectural fact that actually distinguishes this
 * platform: the medical record never arrives here. It lives on the machine in
 * the consulting room, and this site holds only what a front desk would hold.
 * That is worth stating plainly, because it is the thing a visitor cannot
 * verify for themselves and would otherwise have to assume the worst about.
 *
 * Deliberately not dressed up as a legal notice — no article numbers, no
 * invented data-protection officer. Those go in when there is a real legal
 * entity and a real address behind them.
 */

const PILLARS = [
  {
    Icon: Server,
    title: "Votre dossier médical ne passe jamais par ce site",
    body: "Les notes de consultation, les antécédents, les traitements, le groupe sanguin : tout cela est enregistré par le logiciel installé sur l'ordinateur de votre médecin, et n'a aucune colonne dans la base de ce site. Même le secrétariat ne le voit pas depuis ici.",
  },
  {
    Icon: Database,
    title: "Ce que ce site conserve vraiment",
    body: "Ce qu'un comptoir d'accueil manipule : votre nom, votre téléphone, le motif que vous écrivez vous-même, et le créneau que vous avez choisi. Une demande de rendez-vous est une note dans une corbeille — elle ne devient un dossier patient que si le secrétariat l'accepte.",
  },
  {
    Icon: EyeOff,
    title: "L'agenda public ne dit pas qui consulte",
    body: "Pour afficher les créneaux libres, le site publie uniquement des paires d'horaires occupés — un début et une fin, rien d'autre. Aucun nom, aucun motif, aucun identifiant. Il est impossible d'apprendre qui voit quel médecin, ni pourquoi.",
  },
  {
    Icon: Lock,
    title: "Aucun compte patient",
    body: "Vous n'avez rien à créer et rien à retenir. Il n'existe pas de compte patient sur DoctorY, donc pas de mot de passe à nous confier et pas de profil qui vous suit d'un établissement à l'autre.",
  },
];

export default function ConfidentialitePage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-[-0.025em]">
          Confidentialité
        </h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-foreground/75">
          DoctorY est un annuaire et une boîte de réception de rendez-vous. Ce
          n&apos;est pas un dossier médical, et il est construit pour ne jamais
          en devenir un.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {PILLARS.map(({ Icon, title, body }) => (
            <section
              key={title}
              className="flex gap-4 rounded-2xl border border-border-warm bg-card p-5 shadow-card sm:p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[1.02rem] font-bold">{title}</h2>
                <p className="text-[0.92rem] leading-relaxed text-foreground/75">
                  {body}
                </p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-5 text-[0.95rem] leading-relaxed text-foreground/80">
          <div>
            <h2 className="mb-2 text-lg font-bold">Qui voit votre demande</h2>
            <p>
              Uniquement le secrétariat de l&apos;établissement que vous avez
              choisi. Les établissements sont cloisonnés les uns des autres :
              un cabinet ne peut pas lire les demandes adressées à un autre, et
              cette séparation est appliquée par la base de données elle-même,
              pas seulement par l&apos;interface.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-bold">
              Si vous êtes déjà patient du cabinet
            </h2>
            <p>
              Vous pouvez indiquer votre numéro de dossier pour accélérer la
              confirmation. Le site vérifie seulement que ce numéro et votre
              téléphone vont ensemble, et n&apos;obtient en retour qu&apos;un
              oui ou un non — jamais le contenu de votre dossier.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-bold">Les signalements</h2>
            <p>
              Si vous signalez une erreur sur une fiche, nous conservons ce que
              vous écrivez et, si vous l&apos;avez laissé, votre contact — pour
              vous répondre et pour corriger. Ces signalements ne sont lisibles
              que par l&apos;équipe qui maintient l&apos;annuaire.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-bold">Vos droits</h2>
            <p>
              Vous pouvez demander à consulter, corriger ou supprimer les
              informations que ce site détient sur vous. Pour le contenu de
              votre dossier médical, l&apos;interlocuteur est votre médecin :
              il en est le seul détenteur, et nous n&apos;y avons pas accès.
            </p>
            {/* A contact route has to be a real one. Left as a marker rather
                than an invented address, which would be worse than nothing. */}
            <p className="mt-3 rounded-xl bg-paper-muted px-4 py-3 text-sm text-muted-foreground">
              Adresse de contact à renseigner avant mise en ligne :
              [VOTRE ADRESSE E-MAIL DE CONTACT].
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
