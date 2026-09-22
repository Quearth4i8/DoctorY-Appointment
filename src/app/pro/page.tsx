import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Inbox,
  MapPin,
  Sparkles,
} from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { countProvidersByKind } from "@/lib/providers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace professionnel",
  description:
    "Publiez votre établissement sur DoctorY : horaires, tarifs, gardes et demandes de rendez-vous. Gratuit pour toute la profession.",
};

/**
 * The page that turns a health professional into a listing.
 *
 * Its whole job is to answer two questions before anyone fills a form: what
 * does it cost, and what do I have to install. The answers — nothing, and
 * nothing — are the reason the annuaire can be complete, so they lead.
 */

const MODES = [
  {
    Icon: CalendarCheck,
    title: "Agenda en direct",
    who: "Cabinets équipés de l'application DoctorY",
    body: "Vos créneaux réels remontent du poste installé au cabinet. Le patient choisit une heure précise, le secrétariat confirme. C'est le seul mode qui affiche un horaire, parce que c'est le seul où l'horaire est vrai.",
    accent: "border-primary bg-primary-soft/40",
  },
  {
    Icon: Inbox,
    title: "Demande simple",
    who: "Laboratoires, cliniques, opticiens, infirmiers",
    body: "Aucune installation. Le patient dit quand il est disponible, vous répondez depuis votre tableau de bord ou par téléphone. C'est le mode par défaut, et il suffit à la plupart des établissements.",
    accent: "border-border-warm bg-card",
  },
  {
    Icon: MapPin,
    title: "Sans rendez-vous",
    who: "Pharmacies et parapharmacies",
    body: "Rien à réserver. Votre fiche affiche vos horaires, vos gardes et l'itinéraire — ce que les gens cherchent réellement à 22 h. C'est une réponse complète, pas une version dégradée.",
    accent: "border-border-warm bg-card",
  },
];

const PLANS = [
  {
    name: "Gratuit",
    price: "0 DT",
    period: "pour toujours",
    pitch: "Le socle. Il ne disparaîtra pas.",
    features: [
      "Fiche complète : horaires, adresse, téléphone",
      "Tarifs et prestations",
      "Demandes de rendez-vous illimitées",
      "Calendrier de garde (pharmacies)",
      "Présence dans la recherche et sur la carte",
    ],
    cta: "Inscrire mon établissement",
    href: "/pro/revendiquer?type=inscription",
    highlight: false,
  },
  {
    name: "Vérifié",
    price: "[VOTRE PRIX]",
    period: "par mois",
    pitch: "Le badge que les patients regardent.",
    features: [
      "Tout le plan gratuit",
      "Badge « Fiche vérifiée » contrôlé par nos soins",
      "Photos de l'établissement",
      "Statistiques : vues, demandes, taux de réponse",
      "Plusieurs praticiens sous le même établissement",
    ],
    cta: "Nous contacter",
    href: "/pro/revendiquer?type=inscription",
    highlight: true,
  },
  {
    name: "Sponsorisé",
    price: "[VOTRE PRIX]",
    period: "par mois",
    pitch: "Remonter dans les résultats que vous méritez déjà.",
    features: [
      "Tout le plan vérifié",
      "Placement en tête des résultats correspondants",
      "Mise en avant sur la page de votre ville",
      "Encart identifié « Sponsorisé »",
    ],
    cta: "Nous contacter",
    href: "/pro/revendiquer?type=inscription",
    highlight: false,
  },
];

export default async function ProPage() {
  const counts = await countProvidersByKind();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1100px] px-4 py-16 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Gratuit pour toute la profession
          </span>

          <h1 className="mx-auto mt-5 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[3.25rem]">
            Vos patients vous cherchent.
            <br />
            Faites-vous trouver.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-foreground/75">
            Publiez vos horaires, vos tarifs et vos gardes, et recevez les
            demandes de rendez-vous au même endroit. Sans logiciel à installer,
            sans engagement, et sans rien payer pour être présent.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/pro/revendiquer?type=inscription"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              Inscrire mon établissement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pro/revendiquer?type=revendication"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-input bg-card px-5 text-[0.95rem] font-bold transition-colors hover:bg-paper-muted"
            >
              <BadgeCheck className="h-4 w-4" />
              Ma fiche existe déjà
            </Link>
          </div>

          {total > 0 ? (
            <p className="mt-5 font-mono text-xs text-muted-foreground tnum">
              {total} établissement{total > 1 ? "s" : ""} déjà référencé
              {total > 1 ? "s" : ""}
            </p>
          ) : null}
        </section>

        {/* Comment ça marche */}
        <section className="border-y border-border-warm bg-paper-muted">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Trois façons d&apos;être joignable
            </h2>
            <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-foreground/75">
              Vous choisissez celle qui correspond à votre métier. Elle décide
              de ce que le patient voit sur votre fiche — et vous pouvez en
              changer à tout moment.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {MODES.map(({ Icon, title, who, body, accent }) => (
                <div
                  key={title}
                  className={cn("flex flex-col gap-3 rounded-2xl border p-6", accent)}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[1.02rem] font-bold">{title}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {who}
                    </p>
                  </div>
                  <p className="text-[0.9rem] leading-relaxed text-foreground/75">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
            Tarifs
          </h2>
          <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-foreground/75">
            Être présent ne coûte rien et ne coûtera jamais rien : un annuaire
            incomplet n&apos;aide personne. Ce qui se paie, c&apos;est la
            visibilité et la vérification.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col gap-5 rounded-2xl border p-6",
                  plan.highlight
                    ? "border-2 border-primary bg-card shadow-card-hover"
                    : "border-border-warm bg-card shadow-card",
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.highlight ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-extrabold text-accent-foreground">
                        Le plus demandé
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.pitch}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tnum">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.88rem]">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="leading-relaxed text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-all",
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "border border-input bg-card hover:bg-paper-muted",
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Saying this out loud is the point: an annuaire people trust is one
              where paid placement is visible and never fabricates a match. */}
          <p className="mt-6 max-w-3xl rounded-2xl bg-paper-muted px-5 py-4 text-[0.85rem] leading-relaxed text-muted-foreground">
            Un établissement sponsorisé remonte uniquement dans les résultats
            auxquels il correspond déjà, et son encart porte toujours la mention
            « Sponsorisé ». Payer ne fait apparaître personne dans une recherche
            qui ne le concerne pas.
          </p>
        </section>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
