/**
 * A practice's phone numbers, stored in the single `phone` text column.
 *
 * One column, several numbers: they are kept joined with " / " rather than
 * moved to a new column or table, so the mirror trigger onto `providers`, the
 * annuaire, imports and every existing row keep working unchanged. Anything
 * that shows or dials a number goes through `splitPhones` instead of using the
 * raw string — "+216… / +216…" as one tel: link dials nothing useful.
 */

const SEPARATOR = " / ";

/** "+21623570122/+21628703268" → ["+21623570122", "+21628703268"]. */
export function splitPhones(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[\/;,|\n]+/)
    .map((p) => p.trim())
    .filter((p) => /\d/.test(p));
}

/** The form's list back into the column. Blank rows are dropped. */
export function joinPhones(phones: string[]): string {
  return phones
    .map((p) => p.trim())
    .filter(Boolean)
    .join(SEPARATOR);
}

/** What a dialler wants: digits and a leading +. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Grouped for reading. Tunisian numbers — eight digits, with or without the
 * +216 / 00216 prefix — become "+216 23 570 122"; anything else is shown as
 * it was typed rather than guessed at.
 */
export function formatPhone(phone: string): string {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");

  let local: string | null = null;
  if (/^(00)?216\d{8}$/.test(digits)) {
    local = digits.slice(-8);
  } else if (digits.length === 8 && !raw.startsWith("+")) {
    local = digits;
  }

  if (!local) return raw;
  return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
