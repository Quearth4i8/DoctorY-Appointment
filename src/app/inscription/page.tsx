import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer un compte secrétaire — DoctorY",
};

const POINTS = [
  {
    icon: KeyRound,
    text: "La clé de liaison vous est donnée par votre médecin",
  },
  {
    icon: UserPlus,
    text: "Elle relie automatiquement votre compte à son cabinet",
  },
  {
    icon: ShieldCheck,
    text: "Le dossier médical reste chez le médecin",
  },
];

export default function InscriptionPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-8"
      style={{ backgroundImage: "url(/back-login.png)" }}
    >
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-10 pl-4 pr-4 lg:pl-16 lg:pr-36">
        <div className="hidden max-w-md shrink-0 flex-col items-center text-center lg:flex">
          <Image
            src="/logo-doctory.png"
            alt="DoctorY"
            width={144}
            height={144}
            priority
            className="mb-6 h-36 w-36 object-contain drop-shadow-xl"
          />

          <h1 className="text-3xl font-bold leading-snug text-slate-800">
            Créer votre compte
          </h1>

          <div className="mb-4 mt-3 flex items-center gap-1.5">
            <span className="h-0.5 w-8 rounded-full bg-teal-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          </div>

          <p className="text-sm leading-relaxed text-slate-500">
            Un compte secrétaire donne accès à l&apos;agenda, aux patients et aux
            demandes de rendez-vous de votre médecin.
          </p>

          <div className="mt-8 w-full space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{text}</span>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="mt-8 text-sm font-medium text-slate-500 hover:text-teal-700 hover:underline"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="h-[30rem] w-full max-w-md animate-pulse rounded-2xl bg-white/70 shadow-2xl" />
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
