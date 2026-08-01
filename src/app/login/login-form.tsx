"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Home, Loader2, Lock, LogIn, Mail, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/**
 * Icon-prefixed field matching the login card's design.
 *
 * Deliberately not the app-wide <Input>: this page keeps a fixed light skin
 * because it sits on the background photo, exactly like the desktop app's
 * login does.
 */
function IconField({
  icon: Icon,
  rightSlot,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ className?: string }>;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-teal-50">
        <Icon className="h-4 w-4 text-teal-600" />
      </span>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-14 pr-11 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      />
      {rightSlot}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/agenda";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Supabase returns English messages; keep the UI in French.
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible. Réessayez.",
      );
      setLoading(false);
      return;
    }

    // Server Components read the session from cookies, so refresh before moving.
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-9 shadow-2xl">
      <div className="pointer-events-none absolute right-6 top-6 grid grid-cols-4 gap-1.5 opacity-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-slate-300" />
        ))}
      </div>

      {/* Mobile logo — the left panel is hidden below lg. */}
      <div className="mb-6 flex items-center gap-2.5 lg:hidden">
        <Image
          src="/logo-doctory.png"
          alt="DoctorY"
          width={36}
          height={36}
          priority
          className="h-9 w-9 rounded-xl object-cover"
        />
        <span className="font-semibold tracking-tight text-slate-800">DoctorY</span>
      </div>

      <div className="mb-8 flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50">
          <User className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Bon retour</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Connectez-vous à votre espace secrétaire
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Email
          </label>
          <IconField
            id="email"
            icon={Mail}
            type="email"
            placeholder="secretaire@doctory.tn"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Mot de passe
          </label>
          <IconField
            id="password"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Se connecter
        </button>

        <p className="pt-1 text-center text-sm text-slate-500">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-semibold text-teal-600 hover:underline"
          >
            Créer un compte secrétaire
          </Link>
        </p>

        {/* A patient who lands here by mistake needs a way back out. */}
        <Link
          href="/"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <Home className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <p className="pt-1 text-center text-xs text-slate-400">
          Espace réservé au personnel autorisé.
        </p>
      </form>
    </div>
  );
}
