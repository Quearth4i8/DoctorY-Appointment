"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Home,
  Loader2,
  ShieldCheck,
  Send,
  Stethoscope,
  UserPlus,
  UserRound,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

/** Radix Select has no concept of an empty value, so "unset" needs a token. */
const NONE = "__none__";

const EMPTY = {
  last_name: "",
  first_name: "",
  phone: "",
  gender: "",
  age: "",
  numero_dossier: "",
};

export function RequestForm({
  doctorSlug,
  doctorName,
  doctorSpecialty,
  doctorPhoto,
  at,
}: {
  doctorSlug: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  /** "YYYY-MM-DDTHH:mm" — validated by the page before we get here. */
  at: string;
}) {
  const chosen = new Date(`${at}:00`);

  const [existing, setExisting] = useState<boolean | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [company, setCompany] = useState(""); // honeypot
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // null = not checked yet, true/false = server's answer for dossier+phone.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  useEffect(() => {
    if (!scriptReady || !widgetRef.current || widgetId.current || !siteKey) return;
    widgetId.current =
      window.turnstile?.render(widgetRef.current, {
        sitekey: siteKey,
        callback: (t) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      }) ?? null;
  }, [scriptReady, siteKey]);

  const dossier = form.numero_dossier.trim();
  const phoneDigits = form.phone.replace(/\D/g, "");

  /**
   * Ask the server whether this dossier + phone belong to the same patient.
   *
   * The response is a bare boolean: file numbers are guessable, so the record
   * itself is never sent to the browser. A "true" simply lets us stop asking
   * for details the doctor already has.
   */
  useEffect(() => {
    if (existing !== true || !dossier || phoneDigits.length < 6) {
      setVerified(null);
      return;
    }

    let cancelled = false;
    setChecking(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/public/verify-dossier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero_dossier: dossier,
            phone: phoneDigits,
            doctor_slug: doctorSlug,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { verified?: boolean };
        if (!cancelled) setVerified(data.verified === true);
      } catch {
        if (!cancelled) setVerified(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setChecking(false);
    };
  }, [existing, dossier, phoneDigits, doctorSlug]);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (existing === null) {
      return setError("Indiquez si vous êtes déjà patient ou non.");
    }
    if (form.phone.replace(/\D/g, "").length < 6) {
      return setError("Entrez un numéro de téléphone valide.");
    }
    if (existing && !dossier) {
      return setError("Entrez votre numéro de dossier.");
    }
    // When the dossier is confirmed the server fills the identity in; otherwise
    // we still need a name to give the secretary something to work with.
    if (!verified && !form.last_name.trim()) {
      return setError("Le nom est obligatoire.");
    }

    setSending(true);
    try {
      const res = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: form.age || null,
          is_existing_patient: existing,
          numero_dossier: existing ? form.numero_dossier : "",
          preferred_at: at,
          doctor_slug: doctorSlug,
          company,
          turnstile_token: token,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Envoi impossible. Réessayez.");
        // The token is single-use; get a fresh one before another attempt.
        window.turnstile?.reset(widgetId.current ?? undefined);
        setToken("");
        return;
      }
      setSent(true);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-white p-9 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-800">
          Votre demande a bien été envoyée
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Le secrétariat de {doctorName} va l&apos;examiner et vous rappellera au{" "}
          <span className="font-semibold text-slate-700">{form.phone}</span> pour
          confirmer. Ce n&apos;est pas encore un rendez-vous confirmé.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-medium capitalize text-slate-700">
          <CalendarCheck className="h-4 w-4 text-teal-600" />
          {format(chosen, "EEEE d MMMM 'à' HH:mm", { locale: fr })}
        </p>

        {/* Without these the visitor is stranded on a dead end. */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <Link
            href={`/medecins/${doctorSlug}`}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au médecin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onLoad={() => setScriptReady(true)}
      />

      <form onSubmit={submit} className="rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        {/* Who and when — the two facts the visitor already chose. */}
        <div className="mb-7 flex flex-wrap items-center gap-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
          {doctorPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctorPhoto}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600">
              <Stethoscope className="h-6 w-6" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-800">{doctorName}</p>
            {doctorSpecialty ? (
              <p className="truncate text-sm text-teal-700">{doctorSpecialty}</p>
            ) : null}
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium capitalize text-slate-600">
              <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              {format(chosen, "EEEE d MMMM 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        </div>

        {/* Honeypot: off-screen and hidden from assistive tech, so only a bot
            filling every field will set it. */}
        <div aria-hidden className="pointer-events-none absolute -left-[9999px]">
          <label>
            Société
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        {/* Existing vs new patient */}
        <fieldset className="mb-6">
          <legend className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Êtes-vous déjà patient ? <span className="text-red-500">*</span>
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <PatientTypeCard
              icon={UserRound}
              title="Déjà patient"
              subtitle="J'ai déjà un dossier"
              selected={existing === true}
              onSelect={() => setExisting(true)}
            />
            <PatientTypeCard
              icon={UserPlus}
              title="Nouveau patient"
              subtitle="Première visite"
              selected={existing === false}
              onSelect={() => setExisting(false)}
            />
          </div>

          {existing ? (
            <div className="mt-4">
              <label
                htmlFor="dossier"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Numéro de dossier <span className="text-red-500">*</span>
              </label>
              <input
                id="dossier"
                value={form.numero_dossier}
                onChange={(e) => set("numero_dossier", e.target.value)}
                placeholder="ex. 83/2026"
                maxLength={40}
                className={INPUT}
              />
              <p className="mt-1 text-xs text-slate-400">
                Il figure sur votre carnet ou vos ordonnances. Si vous ne le
                trouvez pas, choisissez « Nouveau patient ».
              </p>
            </div>
          ) : null}
        </fieldset>

        {/* Phone comes before the rest: with the dossier it identifies a
            returning patient, so the other fields become unnecessary. */}
        {existing !== null ? (
          <div className="mb-4">
            <Field
              label="Téléphone"
              required
              hint={
                existing
                  ? "Le même numéro que celui enregistré chez le médecin."
                  : "Le secrétariat vous rappellera sur ce numéro."
              }
            >
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="tel"
                required
                placeholder="20 123 456"
                className={INPUT}
              />
            </Field>
          </div>
        ) : null}

        {/* Result of the dossier + phone check. Deliberately says nothing about
            the patient — only whether the pair matched. */}
        {existing && dossier && phoneDigits.length >= 6 ? (
          <div className="mb-5">
            {checking ? (
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification de votre dossier…
              </p>
            ) : verified ? (
              <p className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm text-teal-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>
                  Dossier confirmé. Vos informations sont déjà enregistrées chez
                  le médecin — rien d&apos;autre à saisir.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Ce numéro de dossier et ce téléphone ne correspondent pas.
                  Vérifiez-les, ou complétez vos informations ci-dessous.
                </span>
              </p>
            )}
          </div>
        ) : null}

        {/* Only asked when the dossier could not vouch for the visitor. */}
        {existing !== null && !verified ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" required>
              <input
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                maxLength={80}
                className={INPUT}
              />
            </Field>
            <Field label="Prénom">
              <input
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                maxLength={80}
                className={INPUT}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sexe">
                <Select
                  value={form.gender || NONE}
                  onValueChange={(v) => set("gender", v === NONE ? "" : v)}
                >
                  <SelectTrigger className={TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    <SelectItem value="M">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Âge">
                <input
                  value={form.age}
                  onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  maxLength={3}
                  className={INPUT}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {siteKey ? <div ref={widgetRef} className="mt-5" /> : null}

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sending}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Envoyer la demande
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
          Ce créneau n&apos;est pas réservé tant que le secrétariat ne vous a pas
          rappelé. En cas d&apos;urgence, contactez directement les urgences.
        </p>
      </form>
    </>
  );
}

const INPUT =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

/** The shared Select, repainted for this page's fixed light skin. */
const TRIGGER =
  "h-12 rounded-xl border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-800 shadow-none focus:border-teal-500 focus:shadow-none focus:ring-2 focus:ring-teal-500/30 hover:border-slate-300";

function PatientTypeCard({
  icon: Icon,
  title,
  subtitle,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
