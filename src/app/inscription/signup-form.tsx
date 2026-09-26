"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  UserPlus,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

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

/**
 * Supabase answers in English and in error codes; this says what to DO.
 *
 * The rate limit is the one that matters. It arrives after several attempts,
 * and the old catch-all told the person to try again — which is exactly what
 * spends the remaining quota and keeps them locked out longer.
 */
function signUpMessage(err: {
  message: string;
  code?: string | number;
  status?: number;
}): string {
  // Coerced on purpose: the JS client hands back `code` as the string error
  // code, while the raw endpoint puts the HTTP status there as a number.
  // Calling .includes() on a number is a TypeError that would swallow the
  // very message this function exists to show.
  const code = String(err.code ?? "");
  const text = err.message.toLowerCase();

  if (code.includes("over_email_send_rate_limit") || err.status === 429) {
    return "Trop de tentatives d'inscription. L'envoi d'emails est temporairement bloqué — réessayez dans une heure.";
  }
  if (code === "user_already_exists" || text.includes("already")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (code === "weak_password" || text.includes("password")) {
    return "Mot de passe trop faible. Utilisez au moins 6 caractères.";
  }
  if (code === "email_address_invalid" || text.includes("invalid email")) {
    return "Adresse email invalide.";
  }
  if (code === "signup_disabled" || text.includes("signups not allowed")) {
    return "Les inscriptions sont désactivées sur ce serveur.";
  }
  if (text.includes("error sending") || text.includes("smtp")) {
    return "L'email de confirmation n'a pas pu être envoyé. Prévenez votre médecin.";
  }
  // Better a sentence nobody wrote than a dead end nobody can debug.
  return `Création impossible : ${err.message}`;
}

export function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!fullName.trim()) return setError("Entrez votre nom.");
    if (password.length < 6) {
      return setError("Le mot de passe doit faire au moins 6 caractères.");
    }
    if (key.trim().length < 16) return setError("Clé de liaison invalide.");

    setLoading(true);
    const supabase = createClient();

    // Check the key before creating anything, so a typo does not leave a
    // half-made account behind that can never become staff.
    const { data: valid, error: keyError } = await supabase.rpc("key_is_valid", {
      p_key: key.trim(),
    });

    // A failed CALL is not a rejected key. Discarding this error meant a
    // missing migration, a dropped grant or a stale PostgREST schema cache all
    // surfaced as "check it with your doctor" — sending people to re-read a key
    // that was correct all along, with nothing anywhere saying what broke.
    if (keyError) {
      setLoading(false);
      return setError(
        `Vérification de la clé impossible : ${keyError.message}. Prévenez votre médecin.`,
      );
    }

    if (valid !== true) {
      setLoading(false);
      return setError(
        "Cette clé de liaison n'est pas reconnue. Vérifiez-la auprès de votre médecin.",
      );
    }

    /*
     * The pairing key travels with the account.
     *
     * When email confirmation is on there is no session here, so the claim
     * below cannot run and the key would be lost between this form and the
     * confirmation link. Carrying it on the user lets the first successful
     * login finish the job — see login-form.tsx.
     *
     * It is not a secret being leaked: the person just typed it, and
     * `claim_staff_with_key` validates it server-side, so a forged value in
     * metadata buys nothing.
     */
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { pairing_key: key.trim(), full_name: fullName.trim() } },
    });

    if (signUpError) {
      setLoading(false);
      return setError(signUpMessage(signUpError));
    }

    // signUp signs the user in when email confirmation is off. If it is on,
    // there is no session yet and the claim waits for the first login.
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoading(false);
      // Not an error: the account exists. Showing this in a red box made a
      // successful signup look like a failure, which is why people retried
      // until they hit the email rate limit.
      return setNotice(
        "Compte créé. Ouvrez l'email de confirmation, puis connectez-vous : la liaison avec le cabinet se terminera toute seule.",
      );
    }

    const { error: claimError } = await supabase.rpc("claim_staff_with_key", {
      p_key: key.trim(),
      p_full_name: fullName.trim(),
    });
    setLoading(false);

    if (claimError) {
      const raised = `${claimError.message} ${claimError.details ?? ""}`;
      return setError(
        raised.includes("ALREADY_STAFF")
          ? "Ce compte est déjà rattaché à un cabinet."
          : raised.includes("INVALID_KEY")
            ? "Clé de liaison invalide."
            : "Compte créé, mais la liaison a échoué. Contactez votre médecin.",
      );
    }

    router.replace("/agenda");
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-9 shadow-2xl">
      <div className="pointer-events-none absolute right-6 top-6 grid grid-cols-4 gap-1.5 opacity-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-slate-300" />
        ))}
      </div>

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
          <UserPlus className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Compte secrétaire</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Avec la clé fournie par votre médecin
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Nom complet
          </label>
          <IconField
            icon={UserRound}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom et prénom"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <IconField
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="secretaire@exemple.tn"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Mot de passe
          </label>
          <IconField
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="6 caractères minimum"
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer" : "Afficher"}
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

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Clé de liaison
          </label>
          <IconField
            icon={KeyRound}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Collez la clé du médecin"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="mt-1 text-xs text-slate-400">
            Votre médecin la trouve dans son application, section « Site de
            rendez-vous ».
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        {/* An account that WAS created, waiting on a confirmation email, is
            good news. It used to appear in the red box above, which read as a
            failure and sent people round the retry loop that exhausts the
            email quota. */}
        {notice ? (
          <p
            role="status"
            className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2 text-sm leading-relaxed text-teal-800"
          >
            {notice}
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
            <UserPlus className="h-4 w-4" />
          )}
          Créer mon compte
        </button>

        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          J&apos;ai déjà un compte
        </Link>
      </form>
    </div>
  );
}
