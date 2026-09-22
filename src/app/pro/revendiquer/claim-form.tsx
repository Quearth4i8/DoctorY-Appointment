"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  TurnstileGate,
  turnstileMisconfigured,
} from "@/components/public/turnstile-gate";
import { Combobox } from "@/components/ui/combobox";
import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import { ALL_CITY_OPTIONS } from "@/lib/tunisia";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

export type ClaimIntent = "inscription" | "revendication";

/**
 * One form, two doors.
 *
 * An inscription needs to know what kind of establishment to create; a
 * revendication already has the row and needs to know who is asking for it.
 * Everything else — who you are, how to reach you — is the same, which is why
 * this is one component and not two near-identical ones.
 */
export function ClaimForm({
  intent,
  providerSlug,
  providerName,
}: {
  intent: ClaimIntent;
  providerSlug?: string;
  providerName?: string;
}) {
  const claiming = intent === "revendication";

  const [kind, setKind] = useState<ProviderKind>("medecin");
  const [establishment, setEstablishment] = useState(providerName ?? "");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [message, setMessage] = useState("");

  const [token, setToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const blocked = turnstileMisconfigured();
  const onToken = useCallback((t: string) => setToken(t), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked) return;

    setBusy(true);
    try {
      const res = await fetch("/api/public/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          provider_slug: providerSlug,
          kind: claiming ? undefined : kind,
          establishment,
          city,
          contact_name: contactName,
          phone,
          email,
          professional_id: professionalId,
          message,
          turnstile_token: token,
          company: "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Impossible d'envoyer la demande.");
        setResetSignal((n) => n + 1);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'envoyer la demande.");
      setResetSignal((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-warm bg-card p-9 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-bold">Demande envoyée</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Nous vous rappelons sur le numéro indiqué pour vérifier vos
          informations. {claiming
            ? "Une fiche n'est transférée qu'après ce contact : c'est ce qui empêche qu'on revendique l'établissement de quelqu'un d'autre."
            : "La fiche est publiée une fois les informations confirmées."}
        </p>
        <Link
          href="/pro"
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          Retour à l&apos;espace professionnel
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6 rounded-2xl border border-border-warm bg-card p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">
          {claiming ? "Revendiquer une fiche" : "Inscrire mon établissement"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {claiming && providerName ? (
            <>
              Vous demandez la gestion de{" "}
              <span className="font-semibold text-foreground">{providerName}</span>.
              Nous vérifions par téléphone avant tout transfert.
            </>
          ) : (
            "Remplissez ces quelques champs ; nous vous rappelons pour confirmer et publier."
          )}
        </p>
      </div>

      {!claiming ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Type d&apos;établissement</span>
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => {
              const meta = kindMeta(k);
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKind(k)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] transition-colors",
                    on
                      ? "border-primary bg-accent font-bold text-accent-foreground"
                      : "border-border-warm bg-card font-semibold text-foreground/75 hover:bg-paper-muted",
                  )}
                >
                  <meta.Icon className="h-[0.95rem] w-[0.95rem]" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!claiming ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="establishment"
            label="Nom de l'établissement"
            value={establishment}
            onChange={setEstablishment}
            required
            maxLength={200}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Ville</span>
            <Combobox
              value={city}
              onChange={setCity}
              options={ALL_CITY_OPTIONS}
              allowCustom
              placeholder="Choisir une ville"
              searchPlaceholder="Ville ou délégation…"
              emptyLabel="Aucune ville connue — tapez la vôtre"
              className="h-12 rounded-xl text-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="contact_name"
          label="Votre nom"
          value={contactName}
          onChange={setContactName}
          required
          maxLength={120}
        />
        <Field
          id="phone"
          label="Téléphone"
          type="tel"
          value={phone}
          onChange={setPhone}
          required
          maxLength={30}
          hint="C'est sur ce numéro que nous vous rappelons."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={setEmail}
          maxLength={160}
          optional
        />
        <Field
          id="professional_id"
          label="N° d'ordre ou registre"
          value={professionalId}
          onChange={setProfessionalId}
          maxLength={80}
          optional
          hint="Accélère la vérification."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-semibold">
          Message <span className="font-normal text-muted-foreground">— facultatif</span>
        </label>
        <textarea
          id="message"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-xl border border-input bg-card px-3.5 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
      </div>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <TurnstileGate onToken={onToken} resetSignal={resetSignal} />

      <button
        type="submit"
        disabled={busy || blocked}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Envoyer la demande
      </button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Aucune fiche n&apos;est créée ni transférée automatiquement. Un membre de
        l&apos;équipe vérifie chaque demande.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  optional = false,
  maxLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> — facultatif</span>
        ) : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
