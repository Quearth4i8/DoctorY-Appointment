import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoctorY — Rendez-vous",
  description: "Agenda et patients — DoctorY",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
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
