/**
 * Whether the bot gate is on.
 *
 * Deliberately NOT in `turnstile.ts`: that module is `server-only`, and the
 * request form has to answer the same question in the browser. Both import
 * this, so the two can never disagree — a page that hides the widget while the
 * server still demands a token is a form nobody can submit, and the visitor is
 * told to check their network.
 *
 * On unless switched off on purpose. Deciding from a *missing* secret would
 * mean one forgotten variable costs a deployment its bot protection while
 * everything still looks correctly configured.
 */

// Typed by hand into a hosting dashboard, so accept what a person would
// plausibly write. "False" quietly meaning the opposite of "false" is not a
// lesson worth teaching at the price of a dead form.
const OFF = new Set(["false", "0", "off", "no"]);

export function turnstileEnabled(): boolean {
  // Must stay a whole static member expression: Next inlines it at build time,
  // and destructuring `process.env` would leave it undefined in the browser.
  const raw = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED;
  return !raw || !OFF.has(raw.trim().toLowerCase());
}
