"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock,
  Cross,
  Download,
  Flag,
  History,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { LATEST_RELEASE, downloadUrl } from "@/lib/desktop-releases";
import { kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * The site's sections, each opening a menu of what is inside it on hover.
 *
 * Every top-level entry is still a real link — clicking "À propos" goes to
 * /a-propos — so the menus add a shortcut without taking a destination away.
 * They also open on keyboard focus and close on Escape or when focus leaves,
 * so nothing here is reachable by mouse alone.
 *
 * Trades still do not get a top-level entry each (see the note on /annuaire):
 * the handful most people look for sit inside "Médecins & pharmacies", with a
 * link to the full catalogue at the bottom.
 */

type MenuLink = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Tinted chip classes for the icon; falls back to the brand tint. */
  chip?: string;
  glyph?: string;
  /** A plain <a> — for the installer download, which is not a page. */
  download?: boolean;
};

type NavSection = {
  href: string;
  label: string;
  /** Extra paths that count as "inside" this section. */
  also?: string[];
  links?: MenuLink[];
  /** The footer link at the bottom of the menu. */
  more?: { href: string; label: string };
  badge?: string;
};

const TRADES: ProviderKind[] = ["medecin", "pharmacie", "laboratoire", "dentiste", "clinique", "imagerie"];

const NAV: NavSection[] = [
  { href: "/", label: "Accueil" },
  {
    // Search and profiles are the annuaire being used, so they keep it lit.
    href: "/annuaire",
    label: "Médecins & pharmacies",
    also: ["/recherche", "/etablissement"],
    links: TRADES.map((kind) => {
      const meta = kindMeta(kind);
      return {
        href: `/recherche?kind=${kind}`,
        label: meta.plural,
        description: meta.blurb,
        icon: meta.Icon,
        chip: meta.chip,
        glyph: meta.glyph,
      };
    }),
    more: { href: "/annuaire", label: "Tous les métiers" },
  },
  {
    href: "/gardes",
    label: "Pharmacie de garde",
    links: [
      {
        href: "/gardes",
        label: "De garde maintenant",
        description: "Les pharmacies ouvertes cette nuit et ce week-end.",
        icon: Cross,
      },
      {
        href: "/recherche?kind=pharmacie",
        label: "Toutes les pharmacies",
        description: "Horaires, adresse et téléphone de chaque officine.",
        icon: Clock,
      },
    ],
  },
  {
    href: "/telecharger",
    label: "Application",
    badge: "Nouveau",
    links: [
      {
        href: downloadUrl(LATEST_RELEASE),
        label: "Télécharger pour Windows",
        description: `Version ${LATEST_RELEASE.version} · ${LATEST_RELEASE.sizeMb} Mo`,
        icon: Download,
        download: true,
      },
      {
        href: "/telecharger#nouveautes",
        label: "Nouveautés",
        description: LATEST_RELEASE.title,
        icon: Sparkles,
      },
      {
        href: "/telecharger#versions",
        label: "Toutes les versions",
        description: "Historique des mises à jour.",
        icon: History,
      },
    ],
    more: { href: "/telecharger", label: "Découvrir l'application" },
  },
  {
    href: "/a-propos",
    label: "À propos",
    also: ["/avis", "/signaler", "/confidentialite"],
    links: [
      {
        href: "/a-propos",
        label: "Comment ça marche",
        description: "Ce qu'est DoctorY, et ce qu'il n'est pas.",
        icon: BookOpen,
      },
      {
        href: "/avis",
        label: "Donner mon avis",
        description: "Ce qui vous aiderait sur le site.",
        icon: MessageSquareHeart,
      },
      {
        href: "/signaler",
        label: "Signaler une erreur",
        description: "Une fiche fausse ou périmée.",
        icon: Flag,
      },
      {
        href: "/confidentialite",
        label: "Confidentialité",
        description: "Ce que nous gardons, et pourquoi.",
        icon: ShieldCheck,
      },
    ],
  },
];

function matches(pathname: string, item: NavSection): boolean {
  if (item.href === "/") return pathname === "/";
  const paths = [item.href, ...(item.also ?? [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** How long the pointer may leave a menu before it closes — enough to cross a gap. */
const CLOSE_DELAY = 140;

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const openNow = useCallback(
    (i: number) => {
      cancelClose();
      setOpen(i);
    },
    [cancelClose],
  );

  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
  }, [cancelClose]);

  // A click that navigates should not leave the menu hanging over the new page.
  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelClose();
    };
  }, [cancelClose]);

  return (
    <nav
      ref={navRef}
      aria-label="Navigation principale"
      className="hidden items-center gap-0.5 lg:flex"
      onBlur={(e) => {
        // Keyboard: close once focus has left the whole nav, not on every tab.
        if (!navRef.current?.contains(e.relatedTarget as Node | null)) setOpen(null);
      }}
    >
      {NAV.map((item, i) => {
        const active = matches(pathname, item);
        const hasMenu = Boolean(item.links?.length);
        const isOpen = open === i;

        return (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => (hasMenu ? openNow(i) : setOpen(null))}
            onMouseLeave={hasMenu ? closeSoon : undefined}
          >
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-haspopup={hasMenu ? "true" : undefined}
              aria-expanded={hasMenu ? isOpen : undefined}
              onFocus={() => (hasMenu ? openNow(i) : setOpen(null))}
              className={cn(
                "inline-flex items-center gap-1 rounded-[0.625rem] px-3 py-2 text-sm transition-colors duration-base",
                active
                  ? "bg-accent font-bold text-accent-foreground"
                  : "font-medium text-muted-foreground hover:bg-paper-muted hover:text-foreground",
                isOpen && !active && "bg-paper-muted text-foreground",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-primary px-1.5 py-px text-[0.6rem] font-extrabold uppercase tracking-wide text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
              {hasMenu ? (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 opacity-60 transition-transform duration-base ease-spring",
                    isOpen && "rotate-180",
                  )}
                />
              ) : null}
            </Link>

            {hasMenu ? <MenuPanel item={item} open={isOpen} onNavigate={() => setOpen(null)} /> : null}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Always mounted, shown and hidden by transition — so it fades and slides in
 * both directions instead of popping out of existence on close. `invisible`
 * takes it out of the tab order and away from the pointer while closed.
 */
function MenuPanel({
  item,
  open,
  onNavigate,
}: {
  item: NavSection;
  open: boolean;
  onNavigate: () => void;
}) {
  const links = item.links ?? [];
  const wide = links.length > 4;

  return (
    // pt-3 is a transparent bridge over the gap under the trigger, so the
    // pointer never "leaves" on its way down into the menu.
    <div
      className={cn(
        "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-all duration-200 ease-spring",
        open
          ? "visible translate-y-0 opacity-100"
          : "pointer-events-none invisible -translate-y-1.5 opacity-0",
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border-warm bg-card shadow-lifted",
          wide ? "w-[34rem]" : "w-[22rem]",
        )}
      >
        <ul className={cn("grid gap-0.5 p-2", wide && "grid-cols-2")}>
          {links.map((link) => {
            const Icon = link.icon;
            const body = (
              <>
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-base ease-spring group-hover/item:scale-105",
                    link.chip ?? "bg-primary/10",
                  )}
                >
                  <Icon className={cn("h-[1.05rem] w-[1.05rem]", link.glyph ?? "text-primary")} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold text-foreground">{link.label}</span>
                  {link.description ? (
                    <span className="text-xs leading-snug text-muted-foreground">
                      {link.description}
                    </span>
                  ) : null}
                </span>
              </>
            );
            const cls =
              "group/item flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-paper-muted focus-visible:bg-paper-muted focus-visible:outline-none";

            return (
              <li key={link.href}>
                {link.download ? (
                  <a href={link.href} className={cls} onClick={onNavigate}>
                    {body}
                  </a>
                ) : (
                  <Link href={link.href} className={cls} onClick={onNavigate}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {item.more ? (
          <Link
            href={item.more.href}
            onClick={onNavigate}
            className="group/more flex items-center justify-between border-t border-border-warm bg-paper-muted/60 px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-paper-muted"
          >
            {item.more.label}
            <ArrowRight className="h-4 w-4 transition-transform duration-base ease-spring group-hover/more:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
