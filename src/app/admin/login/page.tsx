import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";

import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin — DoctorY",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Same tinted wash used behind the site's hero panels — enough to mark
          this as a distinct, more "operator tool" surface than the warm
          public-facing pages, without inventing a second design language. */}
      <div aria-hidden className="bg-mesh pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        <AdminLoginForm />
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
