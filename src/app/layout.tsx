import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { Providers } from "./providers";

/**
 * Three faces, three jobs.
 *
 * Jakarta carries the interface. Fraunces signs page titles and nothing else —
 * it is a variable optical-size serif, so anything using it also wants the
 * `.font-display` class or it renders at its text master. Plex Mono is
 * reserved for figures a reader compares down a column: times, distances,
 * tariffs, dossier and licence numbers.
 *
 * All three are self-hosted by next/font at build time, so no request leaves
 * for Google at runtime.
 */
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["opsz"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DoctorY — toute la santé au même endroit",
    template: "%s — DoctorY",
  },
  description:
    "Médecins, pharmacies, laboratoires, cliniques et opticiens. Trouvez qui il vous faut près de chez vous, et prenez rendez-vous quand c'est possible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        {/* Top-right, where every other app puts them: centred toasts land on
            top of the toolbar the click came from, and the sticky navbar is
            already the thing the eye returns to after an action. */}
        <Toaster
          position="top-right"
          richColors
          offset="1.25rem"
          toastOptions={{ style: { fontSize: "0.95rem" } }}
        />
      </body>
    </html>
  );
}
