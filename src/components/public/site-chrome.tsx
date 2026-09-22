import Image from "next/image";
import Link from "next/link";

import { ProMenu } from "@/components/public/pro-menu";
import { SiteNav } from "@/components/public/site-nav";

/**
 * Header and footer for the pages a patient sees. No session required.
 *
 * The nav is the annuaire's table of contents now, not one practice's menu:
 * a visitor arrives looking for a trade ("pharmacie de garde", "laboratoire")
 * far more often than for a name, so the trades are the top-level links.
 *
 * Still deliberately no global "Demander un rendez-vous": a request needs an
 * establishment, and some establishments have nothing to book at all. The CTA
 * belongs on a profile, where the booking mode is known.
 */

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-warm bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo-doctory.png"
            alt="DoctorY"
            width={36}
            height={36}
            priority
            className="h-8 w-8 rounded-[0.625rem] object-cover"
          />
          <span className="text-base font-extrabold tracking-tight">DoctorY</span>
        </Link>

        <SiteNav />

        <div className="ml-auto flex items-center gap-2">
          <ProMenu />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-warm bg-paper-muted">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo-doctory.png"
                alt=""
                width={36}
                height={36}
                className="h-8 w-8 rounded-[0.625rem] object-cover"
              />
              <span className="text-base font-extrabold tracking-tight">DoctorY</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              L&apos;annuaire de la santé : médecins, pharmacies, laboratoires et
              cliniques. Les rendez-vous sont confirmés par un humain, jamais par
              un robot.
            </p>
          </div>

          <FooterColumn title="Trouver">
            <FooterLink href="/annuaire">Tous les métiers</FooterLink>
            <FooterLink href="/recherche?kind=medecin">Médecins</FooterLink>
            <FooterLink href="/recherche?kind=pharmacie">Pharmacies</FooterLink>
            <FooterLink href="/gardes">Pharmacies de garde</FooterLink>
          </FooterColumn>

          <FooterColumn title="Professionnels">
            <FooterLink href="/pro">Inscrire un établissement</FooterLink>
            <FooterLink href="/pro/revendiquer">Revendiquer une fiche</FooterLink>
            <FooterLink href="/login">Espace secrétariat</FooterLink>
          </FooterColumn>

          <FooterColumn title="À propos">
            <FooterLink href="/a-propos">Comment ça marche</FooterLink>
            <FooterLink href="/avis">Donner mon avis</FooterLink>
            <FooterLink href="/signaler">Signaler une erreur</FooterLink>
            <FooterLink href="/confidentialite">Confidentialité</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border-warm pt-6">
          <p className="text-xs text-muted-foreground">
            © {year} DoctorY. Tous droits réservés.
          </p>
          {/* Deliberately not styled like a link: this is the operator's own
              back office, not a page a visitor or a secretary has any reason
              to open. It sits here, unlabeled beyond a single dot, instead of
              beside "Espace secrétariat" where it would read as a second
              front door. */}
          <Link
            href="/admin/login"
            aria-label="Admin"
            className="-m-2 p-2 text-base leading-none text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            •
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-foreground/75 transition-colors hover:text-primary"
      >
        {children}
      </Link>
    </li>
  );
}
