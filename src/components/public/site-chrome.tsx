import Image from "next/image";
import Link from "next/link";
import { Home, Lock } from "lucide-react";

/**
 * Header and footer for the pages a patient sees. No session required.
 *
 * Deliberately no "Demander un rendez-vous" button here: a request needs a
 * doctor, and the doctor page's slot picker is where that starts. A global CTA
 * would drop the visitor into a form with no doctor attached.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo-doctory.png"
            alt="DoctorY"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-[0.95rem] font-semibold tracking-tight text-slate-800">
            DoctorY
          </span>
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          <Link
            href="/medecins"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Médecins
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            aria-label="Accueil"
            title="Accueil"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Home className="h-[1.15rem] w-[1.15rem]" />
          </Link>

          {/* Not a patient login — there is no patient account, and a bordered
              "Connexion" beside the doctor list read like the way in. Named for
              who it belongs to, with a padlock, and styled down to a quiet link
              so it stops competing with what a visitor actually came to do. */}
          <Link
            href="/login"
            title="Réservé au secrétariat du cabinet. Aucun compte n'est nécessaire pour demander un rendez-vous."
            className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Espace secrétariat</span>
            <span className="sr-only sm:hidden">Espace secrétariat</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 bg-slate-50/60">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo-doctory.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="text-base font-semibold tracking-tight text-slate-800">
                DoctorY
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Prise de rendez-vous en ligne, confirmée par le secrétariat.
            </p>
          </div>

          <FooterColumn title="Navigation">
            <FooterLink href="/">Accueil</FooterLink>
            <FooterLink href="/medecins">Médecins</FooterLink>
          </FooterColumn>

          <FooterColumn title="Cabinet médical">
            <FooterLink href="/login">Espace secrétariat</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-10 border-t border-slate-200/70 pt-6">
          <p className="text-xs text-slate-400">
            © {year} DoctorY. Tous droits réservés.
          </p>
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
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
        className="text-sm text-slate-600 transition-colors hover:text-teal-700"
      >
        {children}
      </Link>
    </li>
  );
}
