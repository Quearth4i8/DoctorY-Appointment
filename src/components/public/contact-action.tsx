import { Mail, Phone, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A phone number or an email address, as a button that hands the visitor to
 * their own app.
 *
 * Deliberately a plain anchor with no client JavaScript: `tel:` and `mailto:`
 * are what the operating system already knows how to route, on a phone and on
 * a desktop alike. That also means these work with the page's scripts still
 * loading, survive "open in new tab", and cost nothing to render.
 *
 * The value is shown in full rather than hidden behind an "Appeler" label —
 * someone reaching for a landline, or writing the number down, should not
 * have to click to read it.
 */

function ContactAction({
  value,
  href,
  glyph: Glyph,
  action,
  mono,
  className,
}: {
  value: string;
  href: string;
  glyph: LucideIcon;
  /** What the click does, under the value. */
  action: string;
  /** Numbers get the tabular face; an address does not. */
  mono?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      title={value}
      className={cn(
        "group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full border border-border-warm bg-card py-1.5 pl-1.5 pr-4 shadow-card",
        "transition-all duration-slow ease-spring hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper-muted",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <Glyph className="h-4 w-4" />
      </span>

      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span
          className={cn(
            "max-w-[13rem] truncate text-[0.85rem] font-bold",
            mono && "font-mono tnum",
          )}
        >
          {value}
        </span>
        <span className="text-[0.62rem] font-semibold text-muted-foreground">
          {action}
        </span>
      </span>
    </a>
  );
}

export function PhoneAction({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  // Imported rows arrive with stray whitespace around the value often enough
  // that it is worth trimming once here rather than at every call site.
  const number = phone.trim();

  return (
    <ContactAction
      value={number}
      // Spaces and dashes are for reading; the dialler wants digits and a
      // leading +.
      href={`tel:${number.replace(/[^\d+]/g, "")}`}
      glyph={Phone}
      action="Appeler"
      mono
      className={className}
    />
  );
}

export function EmailAction({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  const address = email.trim();

  return (
    <ContactAction
      value={address}
      href={`mailto:${address}`}
      glyph={Mail}
      action="Écrire un email"
      className={className}
    />
  );
}
