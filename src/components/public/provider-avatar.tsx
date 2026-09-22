import { kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * An establishment's picture, or its trade mark when it has none.
 *
 * The fallback is the point: most listings arrive from an import with no photo
 * at all, so a broken image frame would be the normal case rather than the
 * exception. A tinted chip carrying the trade icon says "pharmacy" without
 * pretending to be a photograph.
 */
export function ProviderAvatar({
  photoUrl,
  kind,
  name,
  className,
  iconClassName,
}: {
  photoUrl?: string;
  kind: ProviderKind;
  name: string;
  /** Sizing and radius come from the caller — the card and the profile differ. */
  className?: string;
  iconClassName?: string;
}) {
  const meta = kindMeta(kind);

  if (photoUrl) {
    return (
      // A plain <img>, not next/image: profile photos are arbitrary remote
      // URLs (med.tn here, anything tomorrow) and next/image refuses any host
      // not listed in next.config. Allowlisting the internet is not an option,
      // and one broken avatar is not worth blocking a listing over.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        className={cn("shrink-0 object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        meta.chip,
        className,
      )}
    >
      <meta.Icon className={cn(meta.glyph, iconClassName)} />
    </span>
  );
}
