/**
 * Fuzzy matching for the pickers.
 *
 * Its own module rather than a private helper inside the combobox, because
 * this is the part with rules worth checking: French place names are full of
 * accents and apostrophes that nobody types, and getting that wrong makes an
 * otherwise correct dropdown look broken.
 */

export type MatchOption = {
  value: string;
  label: string;
  /** Second line under the label — e.g. the governorate a city sits in. */
  hint?: string;
  /** Extra words that should match, without being shown. */
  keywords?: string;
};

/**
 * Fold a string down to something worth comparing against typing.
 *
 * Nobody reaches for the é key to look up "Kébili", and "M'saken" gets typed
 * with every kind of apostrophe. Strip the accents, flatten the punctuation,
 * and "kebili", "Kébili" and "KEBILI" all land on the same key.
 */
export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The folded form with the gaps closed up.
 *
 * Folding turns "M'saken" into "m saken", so someone typing the name the
 * ordinary way — "msaken", no apostrophe, no space — would match nothing at
 * all. Comparing the gapless forms too catches that, and "bengardane" for
 * "Ben Gardane" with it.
 */
export function squeeze(input: string): string {
  return input.replace(/\s+/g, "");
}

/**
 * How well an option answers what was typed. Lower is better; -1 is no match.
 *
 * The tiers exist so that an exact name outranks a name that merely contains
 * the letters, and so a hit on the hidden keywords never outranks a hit on the
 * label itself.
 */
export function score(option: MatchOption, needle: string): number {
  if (!needle) return 0;

  const label = fold(option.label);
  const haystack = fold(
    `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`,
  );
  const tightLabel = squeeze(label);
  const tightNeedle = squeeze(needle);

  if (label === needle || tightLabel === tightNeedle) return 0;
  if (label.startsWith(needle) || tightLabel.startsWith(tightNeedle)) return 1;
  // A word inside the label — "Hammam" should find "Hammam Sousse" and
  // "Hammam Lif" before it finds anything matching only on the hint.
  if (label.includes(` ${needle}`)) return 2;
  if (label.includes(needle) || tightLabel.includes(tightNeedle)) return 3;
  if (haystack.includes(needle)) return 4;
  return -1;
}

/** Everything that matches, best first. */
export function rank<T extends MatchOption>(
  options: readonly T[],
  query: string,
): T[] {
  const needle = fold(query);
  if (!needle) return [...options];
  return options
    .map((option) => ({ option, rank: score(option, needle) }))
    .filter((row) => row.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map((row) => row.option);
}
