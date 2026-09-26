import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Globe,
  Info,
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import { AvailabilityGrid } from "@/components/public/availability-grid";
import { Breadcrumbs, type Crumb } from "@/components/public/breadcrumbs";
import { EmailAction, PhoneAction } from "@/components/public/contact-action";
import { ProviderAvatar } from "@/components/public/provider-avatar";
import { RatingForm } from "@/components/public/rating-form";
import { RatingStars } from "@/components/public/rating-stars";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { kindMeta } from "@/lib/provider-kinds";
import { getProviderBySlug } from "@/lib/providers";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  formatMillimes,
  type OpeningRange,
  type Provider,
} from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const provider = await getProviderBySlug(params.slug);
  if (!provider) return { title: "Établissement introuvable" };

  const meta = kindMeta(provider.kind);
  return {
    title: `${provider.name} — ${meta.label}${provider.city ? ` à ${provider.city}` : ""}`,
    description:
      provider.bio ||
      `${provider.name}, ${meta.label.toLowerCase()}${provider.city ? ` à ${provider.city}` : ""}. Horaires, tarifs et coordonnées.`,
  };
}

/**
 * One profile template for all twelve trades.
 *
 * Which blocks appear is driven by the data, not by a per-kind branch: a
 * pharmacy has no practitioners and no agenda, so those sections simply do
 * not render. The one genuine fork is the action card, because promising
 * "Réserver" where no live agenda exists is the single thing this page must
 * never do.
 */
export default async function ProviderPage({
  params,
}: {
  params: { slug: string };
}) {
  const provider = await getProviderBySlug(params.slug);

  // An unpublished profile is invisible to visitors: RLS returns nothing, so
  // this is a genuine 404 rather than a "forbidden" that confirms it exists.
  if (!provider || !provider.is_published) notFound();

  const meta = kindMeta(provider.kind);
  const place = [provider.address, provider.city].filter(Boolean).join(", ");

  /*
   * Catalogue → métier → spécialité → this establishment.
   *
   * Every step is a search the visitor can actually run: /recherche has no
   * dedicated specialty parameter, but its free-text `q` is what the search
   * bar itself puts specialty names into, so "Diabétologie" widens to the
   * same results it would from the box. The specialty step is dropped rather
   * than faked when the listing has none.
   */
  const trail: Crumb[] = [
    { label: "Médecins & pharmacies", href: "/annuaire" },
    { label: meta.plural, href: `/recherche?kind=${provider.kind}` },
    ...(provider.specialties.length > 0
      ? [
          {
            label: provider.specialties[0].label,
            href: `/recherche?kind=${provider.kind}&q=${encodeURIComponent(
              provider.specialties[0].label,
            )}`,
          },
        ]
      : []),
    { label: provider.name },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="border-b border-border-warm bg-paper-muted">
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <Breadcrumbs items={trail} className="mb-5" />

          <div className="flex flex-wrap items-center gap-5">
            <ProviderAvatar
              photoUrl={provider.photo_url}
              kind={provider.kind}
              name={provider.name}
              className="h-[5.5rem] w-[5.5rem] rounded-2xl"
              iconClassName="h-9 w-9"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.022em]">
                  {provider.name}
                </h1>
                {provider.verified_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[0.7rem] font-extrabold text-info-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Fiche vérifiée
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground/75">
                <span className={cn("font-bold", meta.glyph)}>{meta.label}</span>
                <RatingStars
                  size="lg"
                  average={provider.rating_avg}
                  count={provider.rating_count}
                />
                {provider.specialties.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4" />
                    {provider.specialties.map((s) => s.label).join(" · ")}
                  </span>
                ) : null}
                {place ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {place}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Right-hand end of the band: status, then how to reach them.
                Getting in touch is what most visitors to a profile do next, so
                it gets controls of its own rather than two more entries in the
                grey meta line above. Stacked, and stretched to full width below
                sm — where they take their own row and double as tap targets. */}
            <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:items-end">
              {provider.open_24_7 || provider.has_emergency ? (
                <span className="inline-flex items-center justify-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-ok-foreground sm:self-end">
                  <span className="h-2 w-2 rounded-full bg-ok" />
                  {provider.has_emergency ? "Urgences 24 h/24" : "Ouvert 24 h/24"}
                </span>
              ) : null}

              {provider.phone ? <PhoneAction phone={provider.phone} /> : null}
              {provider.email ? <EmailAction email={provider.email} /> : null}
            </div>
            </div>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-8">
        {/* `min-w-0` is load-bearing, not tidying.
            A grid item's min-width defaults to `auto`, so this column refused
            to shrink below the min-content width of the slot table inside it
            — eight 104px day columns. The table's own `overflow-x-auto` never
            got a chance: the whole page grew to 846px instead and every phone
            got a horizontally scrolling document, with the header band's
            background ending mid-screen. */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* The slot picker, not a button that promises one. Rendered only
              when there is a real agenda behind it: `legacy_doctor_id` is what
              resolves to the appointments, and without it every opening hour
              would come back free. */}
          {provider.booking_mode === "agenda" && provider.legacy_doctor_id ? (
            <section id="creneaux" className="scroll-mt-24">
              <Panel title="Choisir un créneau">
                <AvailabilityGrid slug={provider.slug} source="provider" />
              </Panel>
            </section>
          ) : null}

          {provider.bio ? (
            <Panel title="À propos">
              <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-foreground/80">
                {provider.bio}
              </p>
            </Panel>
          ) : null}

          {/* Only where an attendance can actually be checked. Without a
              `legacy_doctor_id` there are no appointments behind this
              establishment, so every submission would be refused — better to
              not offer the form than to offer one that always says no. */}
          {provider.legacy_doctor_id ? (
            <section id="noter" className="scroll-mt-24">
              <RatingForm
                providerSlug={provider.slug}
                providerName={provider.name}
              />
            </section>
          ) : null}

          {provider.practitioners.length > 0 ? (
            <Panel title="Praticiens" count={provider.practitioners.length}>
              <ul className="flex flex-col divide-y divide-border-warm">
                {provider.practitioners.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-sm font-extrabold text-primary-soft-foreground">
                      {initials(p.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[0.92rem] font-bold">
                        {`${p.title} ${p.full_name}`.trim()}
                        {p.booking_mode === "agenda" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2 py-0.5 text-[0.62rem] font-extrabold text-ok-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                            Agenda en direct
                          </span>
                        ) : null}
                      </p>
                      {p.bio ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {p.bio}
                        </p>
                      ) : null}
                    </div>
                    {!p.accepts_new_patients ? (
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        Ne prend pas de nouveaux patients
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {provider.services.length > 0 ? (
            <Panel title={serviceTitle(provider)} count={provider.services.length}>
              <ul className="flex flex-col divide-y divide-border-warm">
                {provider.services.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9rem] font-semibold">{s.label}</p>
                      {s.preparation || s.note ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[s.preparation, s.note].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    {s.result_delay_hours ? (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tnum">
                        {s.result_delay_hours} h
                      </span>
                    ) : null}
                    {s.amount_millimes !== null ? (
                      <span className="shrink-0 font-mono text-[0.9rem] font-semibold tnum">
                        {formatMillimes(s.amount_millimes)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {/* An annuaire seeded from imported data is wrong somewhere on day
              one, and the only people who will notice are the ones standing in
              front of a closed door. */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-warm bg-card px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Info className="h-5 w-5" />
            </span>
            <p className="min-w-[14rem] flex-1 text-[0.82rem] leading-relaxed text-muted-foreground">
              Un horaire faux, un numéro qui ne répond plus, un établissement
              fermé ? Dites-le nous et la fiche sera corrigée.
            </p>
            <Link
              href={`/signaler?etablissement=${provider.slug}`}
              className="inline-flex h-10 shrink-0 items-center rounded-xl border border-input bg-card px-4 text-[0.82rem] font-bold transition-colors hover:bg-paper-muted"
            >
              Signaler une erreur
            </Link>
          </div>

          {/* Most listings will arrive from an imported dataset, so the person
              who runs the place has to be able to ask for it. Hidden once
              somebody already has: an unclaimed badge on a claimed listing is
              an invitation to try. */}
          {!provider.claimed_at ? (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-border-warm px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <p className="min-w-[14rem] flex-1 text-[0.82rem] leading-relaxed text-muted-foreground">
                Vous gérez cet établissement ? Prenez la main sur sa fiche pour
                tenir ses horaires et ses tarifs à jour.
              </p>
              <Link
                href={`/pro/revendiquer?type=revendication&etablissement=${provider.slug}`}
                className="inline-flex h-10 shrink-0 items-center rounded-xl bg-primary px-4 text-[0.82rem] font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Revendiquer cette fiche
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <ActionCard provider={provider} />

          {provider.hours.length > 0 ? (
            <Panel title="Horaires">
              <Hours ranges={provider.hours} />
            </Panel>
          ) : null}

          <Panel title="Coordonnées">
            {/* Every line here is somewhere to go, so every line is a row you
                can press rather than a label with a link buried in it. The
                previous version had the address as plain text with a pill
                hanging underneath it, which broke the icon column halfway
                down the list and made one entry look like a different kind of
                thing from the other three. */}
            <ul className="-mx-2 flex flex-col gap-0.5">
              {place ? (
                <ContactRow icon={MapPin} href={directionsUrl(provider)} external>
                  <span className="block leading-relaxed">{provider.address}</span>
                  {provider.postcode || provider.city ? (
                    <span className="block leading-relaxed text-muted-foreground">
                      {[provider.postcode, provider.city].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-[0.7rem] font-bold text-primary">
                    Voir l&apos;itinéraire
                  </span>
                </ContactRow>
              ) : null}

              {provider.phone ? (
                <ContactRow
                  icon={Phone}
                  href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}
                >
                  <span className="block font-mono font-semibold tnum">
                    {provider.phone.trim()}
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    Appeler
                  </span>
                </ContactRow>
              ) : null}

              {provider.email ? (
                <ContactRow icon={Mail} href={`mailto:${provider.email.trim()}`}>
                  <span className="block truncate font-semibold">
                    {provider.email.trim()}
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    Écrire un email
                  </span>
                </ContactRow>
              ) : null}

              {provider.website ? (
                <ContactRow icon={Globe} href={provider.website} external>
                  <span className="block truncate font-semibold">
                    {provider.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    Site web
                  </span>
                </ContactRow>
              ) : null}
            </ul>

            {provider.accepts_cnam || provider.third_party_payer || provider.wheelchair_access ? (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border-warm pt-4">
                {provider.accepts_cnam ? <Tag>Conventionné CNAM</Tag> : null}
                {provider.third_party_payer ? <Tag>Tiers payant</Tag> : null}
                {provider.wheelchair_access ? <Tag>Accès PMR</Tag> : null}
              </div>
            ) : null}
          </Panel>
        </aside>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}

/**
 * The one place this page forks on booking mode.
 *
 * `agenda` is the only branch allowed to offer a time, because it is the only
 * one where times exist. `demande` takes a wish. `aucune` has nothing to book
 * and says so plainly rather than offering a form that would go nowhere.
 */
function ActionCard({ provider }: { provider: Provider }) {
  if (provider.booking_mode === "aucune") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border-warm bg-card p-5 shadow-card">
        <p className="text-[0.95rem] font-bold">Sans rendez-vous</p>
        <p className="text-[0.82rem] leading-relaxed text-muted-foreground">
          Pas de réservation : présentez-vous pendant les horaires d&apos;ouverture.
        </p>
        <Link
          href={directionsUrl(provider)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          <MapPin className="h-4 w-4" />
          Ouvrir l&apos;itinéraire
        </Link>
        {provider.phone ? (
          <a
            href={`tel:${provider.phone.replace(/\s/g, "")}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card text-[0.9rem] font-bold transition-colors hover:bg-paper-muted"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </a>
        ) : null}
      </div>
    );
  }

  const live = provider.booking_mode === "agenda";
  const hasPicker = live && provider.legacy_doctor_id !== null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-5 shadow-card">
      <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
        Prendre rendez-vous
      </span>
      <p className="text-[0.95rem] font-bold">
        {hasPicker ? "Créneaux disponibles en direct" : "Sur demande"}
      </p>
      <p className="text-[0.82rem] leading-relaxed text-muted-foreground">
        {hasPicker
          ? "Choisissez une heure ; le secrétariat vous rappelle pour confirmer."
          : "Dites quand vous êtes disponible ; l'établissement vous rappelle pour fixer l'heure."}
      </p>
      {/* When the picker is on the page, this scrolls to it instead of
          navigating away from the thing it is pointing at. */}
      <Link
        href={hasPicker ? "#creneaux" : `/demande?etablissement=${provider.slug}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110"
      >
        <CalendarDays className="h-4 w-4" />
        {live ? "Choisir un créneau" : "Envoyer une demande"}
      </Link>
      {!provider.accepts_new_patients ? (
        <p className="text-xs font-semibold text-warn-foreground">
          Cet établissement ne prend pas de nouveaux patients pour le moment.
        </p>
      ) : null}
    </div>
  );
}

/** Opening hours, one line per day, ranges joined. */
function Hours({ ranges }: { ranges: OpeningRange[] }) {
  const byDay = new Map<number, OpeningRange[]>();
  for (const r of ranges) {
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);
  }

  return (
    <ul className="flex flex-col gap-2 text-[0.85rem]">
      {DAY_LABELS.map((label, i) => {
        const day = i + 1;
        const list = byDay.get(day) ?? [];
        return (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="text-foreground/80">{label}</span>
            <span
              className={cn(
                "font-mono text-xs tnum",
                list.length === 0 ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {list.length === 0
                ? "Fermé"
                : list.map((r) => `${r.opens_at} – ${r.closes_at}`).join(" · ")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One pressable line of the Coordonnées panel.
 *
 * `external` is what decides the arrow and the `target`, so a row that leaves
 * the site says so and a row that hands off to the phone's own dialler or
 * mail app does not open a dead tab behind it.
 */
function ContactRow({
  icon: Icon,
  href,
  external,
  children,
}: {
  icon: LucideIcon;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-base hover:bg-paper-muted"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground transition-colors duration-base group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1 text-[0.85rem]">{children}</span>

        <ArrowUpRight className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-base ease-spring group-hover:translate-x-0.5 group-hover:text-primary" />
      </a>
    </li>
  );
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-warm bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-[0.95rem] font-bold">{title}</h2>
        {count !== undefined ? (
          <span className="font-mono text-xs text-muted-foreground tnum">{count}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-[0.72rem] font-semibold text-foreground/75">
      {children}
    </span>
  );
}

/** "Tarifs" for a cabinet, "Analyses" for a laboratory — same rows either way. */
function serviceTitle(provider: Provider): string {
  if (provider.kind === "laboratoire") return "Analyses";
  if (provider.kind === "imagerie") return "Examens";
  return "Tarifs";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function directionsUrl(provider: Provider): string {
  const target =
    provider.latitude !== null && provider.longitude !== null
      ? `${provider.latitude},${provider.longitude}`
      : [provider.address, provider.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
}
