"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Building2,
  CalendarClock,
  Check,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { Staff } from "@/lib/supabase/server";

export type AccountInfo = {
  /** What the confirmation link just did, from /auth/confirm's `auth` flag. */
  authNotice: "email_confirmed" | "email_partial" | "link_invalid" | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  /** An email change waiting for its confirmation link to be clicked. */
  pendingEmail: string | null;
  /** "Dr X", the practice this account works for. */
  cabinet: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  secretary: "Secrétaire",
  doctor: "Médecin",
};

const MIN_PASSWORD = 8;

export function ProfileForm({ staff, account }: { staff: Staff; account: AccountInfo }) {
  const [name, setName] = useState(staff.full_name);
  const displayName = name.trim() || staff.full_name || "Compte";
  const [first = "", ...rest] = displayName.split(" ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* ── Identity banner ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border bg-card bg-mesh px-6 py-6 shadow-card">
        <span
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold",
            avatarColor(staff.user_id),
          )}
        >
          {initials(first, rest.join(" ") || first)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">
              {displayName}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {ROLE_LABEL[staff.role] ?? staff.role}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{staff.email}</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {account.cabinet ? (
              <Meta icon={Building2}>Cabinet du {account.cabinet}</Meta>
            ) : null}
            {account.createdAt ? (
              <Meta icon={CalendarClock}>
                Membre depuis {format(new Date(account.createdAt), "MMMM yyyy", { locale: fr })}
              </Meta>
            ) : null}
            {account.lastSignInAt ? (
              <Meta icon={Clock}>
                Dernière connexion{" "}
                {formatDistanceToNow(new Date(account.lastSignInAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </Meta>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <NameSection staff={staff} name={name} setName={setName} />
        <EmailSection staff={staff} />
        <PasswordSection email={staff.email} />
        <SessionsSection />
      </div>

      <DangerZone email={staff.email} />
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function NameSection({
  staff,
  name,
  setName,
}: {
  staff: Staff;
  name: string;
  setName: (v: string) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== staff.full_name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) {
      toast.error("Le nom ne peut pas être vide.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // rename_me() touches only the caller's own row and raises rather than
    // matching nothing, so a success here is a real one.
    let { error } = await supabase.rpc("rename_me", { p_full_name: value });

    if (error && isMissingFunction(error.message)) {
      // Database not migrated yet: fall back to the direct update, but read
      // the row back — with no update policy Postgres changes zero rows and
      // still reports success, which is how this used to fail silently.
      const res = await supabase
        .from("staff")
        .update({ full_name: value })
        .eq("user_id", staff.user_id)
        .select("full_name");
      error = res.error;
      if (!error && (res.data ?? []).length === 0) {
        setSaving(false);
        toast.error(
          "Le nom n'a pas pu être enregistré : la mise à jour de la base n'est pas encore appliquée.",
          { duration: 8000 },
        );
        return;
      }
    }
    setSaving(false);

    if (error) {
      toast.error(`Impossible d'enregistrer le nom : ${error.message}`);
      return;
    }
    toast.success("Nom mis à jour.");
    router.refresh();
  }

  return (
    <Section
      icon={UserRound}
      title="Informations personnelles"
      description="Le nom affiché dans l'application et à vos collègues."
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field id="name" label="Nom complet">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom et nom"
            autoComplete="name"
          />
        </Field>
        <Actions>
          {dirty ? (
            <Button type="button" variant="ghost" onClick={() => setName(staff.full_name)}>
              Annuler
            </Button>
          ) : null}
          <SaveButton saving={saving} disabled={!dirty || !name.trim()}>
            Enregistrer
          </SaveButton>
        </Actions>
      </form>
    </Section>
  );
}

function EmailSection({ staff }: { staff: Staff }) {
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const value = email.trim().toLowerCase();
  const mismatch = confirm.length > 0 && value !== confirm.trim().toLowerCase();
  const same = value === staff.email.toLowerCase();
  const ready =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) &&
    confirm.length > 0 &&
    !mismatch &&
    !same &&
    password.length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    const supabase = createClient();

    // One step, no confirmation email: change_my_email() checks the current
    // password and switches the login address straight away.
    const { error } = await supabase.rpc("change_my_email", {
      p_new_email: value,
      p_password: password,
    });

    if (error) {
      setSaving(false);
      toast.error(changeEmailError(error.message), { duration: 8000 });
      return;
    }

    // The session token still carries the old address; refresh it so the
    // header and this page show the new one straight away.
    await supabase.auth.refreshSession().catch(() => {});
    toast.success(`Email mis à jour. Connectez-vous désormais avec ${value}.`, {
      duration: 8000,
    });
    window.location.reload();
  }

  return (
    <Section
      icon={Mail}
      title="Adresse email"
      description="L'adresse utilisée pour vous connecter. Le changement est immédiat : vérifiez-la bien."
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="rounded-xl border border-border/70 bg-secondary/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Adresse actuelle : </span>
          <span className="font-medium text-foreground">{staff.email}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="new-email" label="Nouvelle adresse">
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              autoComplete="off"
            />
          </Field>
          <Field
            id="confirm-email"
            label="Confirmer l'adresse"
            error={mismatch ? "Les deux adresses ne correspondent pas." : undefined}
          >
            <Input
              id="confirm-email"
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              aria-invalid={mismatch}
              // Retyped, not pasted — the second field is the only typo check.
              onPaste={(e) => e.preventDefault()}
            />
          </Field>
        </div>
        {same && value ? (
          <p className="text-xs text-muted-foreground">C&apos;est déjà votre adresse actuelle.</p>
        ) : null}

        <Field id="email-password" label="Mot de passe actuel">
          <Input
            id="email-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        <Actions>
          <SaveButton saving={saving} disabled={!ready}>
            Changer l&apos;email
          </SaveButton>
        </Actions>
      </form>
    </Section>
  );
}

function PasswordSection({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = passwordStrength(password);
  const mismatch = confirm.length > 0 && password !== confirm;
  const ready =
    current.length > 0 && password.length >= MIN_PASSWORD && password === confirm && !saving;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    if (password === current) {
      toast.error("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    // Prove it is really them before changing anything: an unattended,
    // signed-in screen at the front desk must not be enough.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (authError) {
      setSaving(false);
      toast.error("Mot de passe actuel incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("different")
          ? "Le nouveau mot de passe doit être différent de l'actuel."
          : `Impossible de changer le mot de passe : ${error.message}`,
      );
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    toast.success("Mot de passe mis à jour.");
  }

  return (
    <Section
      icon={KeyRound}
      title="Mot de passe"
      description={`Au moins ${MIN_PASSWORD} caractères. Mélangez lettres, chiffres et symboles.`}
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        {/* Lets password managers pair the new password with this account. */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />

        <Field id="current-password" label="Mot de passe actuel">
          <PasswordInput
            id="current-password"
            value={current}
            onChange={setCurrent}
            show={show}
            autoComplete="current-password"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="new-password" label="Nouveau mot de passe">
            <PasswordInput
              id="new-password"
              value={password}
              onChange={setPassword}
              show={show}
              onToggle={() => setShow((v) => !v)}
              autoComplete="new-password"
            />
          </Field>
          <Field
            id="confirm-password"
            label="Confirmer"
            error={mismatch ? "Les deux mots de passe ne correspondent pas." : undefined}
          >
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={setConfirm}
              show={show}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {password ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full bg-secondary transition-colors",
                    i < strength.score && strength.bar,
                  )}
                />
              ))}
            </div>
            <span className={cn("w-20 text-right text-xs font-semibold", strength.text)}>
              {strength.label}
            </span>
          </div>
        ) : null}

        <Actions>
          <SaveButton saving={saving} disabled={!ready}>
            Modifier le mot de passe
          </SaveButton>
        </Actions>
      </form>
    </Section>
  );
}

function SessionsSection() {
  const [busy, setBusy] = useState(false);

  async function signOutOthers() {
    setBusy(true);
    const { error } = await createClient().auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) {
      toast.error("Impossible de déconnecter les autres appareils.");
      return;
    }
    toast.success("Les autres appareils ont été déconnectés.");
  }

  return (
    <Section
      icon={ShieldCheck}
      title="Sécurité et sessions"
      description="Utile si vous vous êtes connectée sur un autre ordinateur ou un téléphone perdu."
    >
      <div className="flex flex-col gap-3">
        <SessionRow
          icon={MonitorSmartphone}
          title="Autres appareils"
          description="Ferme la session partout ailleurs. Cet appareil reste connecté."
        >
          <Button variant="outline" onClick={signOutOthers} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Déconnecter
          </Button>
        </SessionRow>
        <SessionRow
          icon={LogOut}
          title="Cet appareil"
          description="Vous devrez saisir votre email et mot de passe pour revenir."
        >
          {/* A real POST so the session cookie is cleared server-side. */}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
              Se déconnecter
            </Button>
          </form>
        </SessionRow>
      </div>
    </Section>
  );
}

/** The phrase to retype. Uppercase and unusual enough not to be typed by habit. */
const DELETE_PHRASE = "SUPPRIMER";

function DangerZone({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ready = phrase === DELETE_PHRASE && password.length > 0 && !deleting;

  function onOpenChange(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setPhrase("");
      setPassword("");
    }
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account", { p_password: password });

    if (error) {
      setDeleting(false);
      toast.error(
        error.message.includes("WRONG_PASSWORD")
          ? "Mot de passe incorrect."
          : error.message.includes("Could not find the function")
            ? "Suppression indisponible : la mise à jour de la base n'est pas encore appliquée."
            : `Suppression impossible : ${error.message}`,
      );
      return;
    }

    // The account is gone; drop the now-orphaned session and leave.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    window.location.href = "/";
  }

  return (
    <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6 lg:p-8">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlert className="h-[1.05rem] w-[1.05rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[0.95rem] font-semibold text-destructive">Supprimer le compte</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Supprime définitivement votre accès à la console. Les patients et rendez-vous du
          cabinet ne sont pas touchés.
        </p>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 />
            Supprimer mon compte
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              Supprimer définitivement le compte ?
            </DialogTitle>
            <DialogDescription>
              Le compte <strong className="text-foreground">{email}</strong> sera supprimé et
              vous serez déconnectée. Cette action est <strong>irréversible</strong> : pour
              revenir, il faudra qu&apos;on vous recrée un accès.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={remove} className="flex flex-col gap-4">
            <Field id="delete-phrase" label={`Tapez ${DELETE_PHRASE} pour confirmer`}>
              <Input
                id="delete-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={DELETE_PHRASE}
                autoComplete="off"
                spellCheck={false}
                // Pasting would defeat the point of retyping it.
                onPaste={(e) => e.preventDefault()}
                aria-invalid={phrase.length > 0 && phrase !== DELETE_PHRASE}
              />
            </Field>
            <Field id="delete-password" label="Mot de passe actuel">
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button type="submit" variant="destructive" disabled={!ready}>
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Supprimer définitivement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Building blocks ────────────────────────────────────────────────────────

/** One row of the settings card: what it is on the left, the form on the right. */
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-border/70 p-6 last:border-b-0 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        </span>
        <div>
          <h2 className="text-[0.95rem] font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 pt-1">{children}</div>;
}

function SaveButton({
  saving,
  disabled,
  children,
}: {
  saving: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" disabled={saving || disabled} className="min-w-40">
      {saving ? <Loader2 className="animate-spin" /> : <Check />}
      {children}
    </Button>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  /** Only one field carries the eye; it reveals all three together. */
  onToggle?: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={onToggle ? "pr-11" : undefined}
      />
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Masquer les mots de passe" : "Afficher les mots de passe"}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : null}
    </div>
  );
}

function SessionRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 px-4 py-3.5">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Meta({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): {
  score: number;
  label: string;
  bar: string;
  text: string;
} {
  if (pw.length < MIN_PASSWORD) {
    return { score: 1, label: "Trop court", bar: "bg-destructive", text: "text-destructive" };
  }
  let score = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  score = Math.min(score, 4);
  if (score <= 2) return { score, label: "Moyen", bar: "bg-warn", text: "text-warn-foreground" };
  if (score === 3) return { score, label: "Bon", bar: "bg-primary/70", text: "text-primary" };
  return { score, label: "Excellent", bar: "bg-ok", text: "text-ok-foreground" };
}

function isMissingFunction(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("could not find the function") || m.includes("does not exist");
}

/** change_my_email()'s error codes → something a secretary can act on. */
function changeEmailError(message: string): string {
  if (message.includes("WRONG_PASSWORD")) return "Mot de passe actuel incorrect.";
  if (message.includes("EMAIL_TAKEN")) return "Cette adresse est déjà utilisée par un autre compte.";
  if (message.includes("INVALID_EMAIL")) return "Adresse email invalide.";
  if (isMissingFunction(message)) {
    return "Changement indisponible : la mise à jour de la base n'est pas encore appliquée.";
  }
  return `Impossible de changer l'email : ${message}`;
}
