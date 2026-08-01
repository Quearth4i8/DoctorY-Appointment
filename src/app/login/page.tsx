import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { CalendarCheck, Shield, Users } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — DoctorY",
};

/** Mirrors the desktop app's login, adapted to what the secretary actually does. */
const FEATURES = [
  {
    icon: CalendarCheck,
    text: "Agenda et rendez-vous en temps réel",
    tint: "bg-teal-100 text-teal-600",
  },
  {
    icon: Users,
    text: "Fiches patients toujours à jour",
    tint: "bg-teal-100 text-teal-600",
  },
  {
    icon: Shield,
    text: "Dossier médical réservé au médecin",
    tint: "bg-rose-100 text-rose-500",
  },
];

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-8"
      style={{ backgroundImage: "url(/back-login.png)" }}
    >
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-10 pl-4 pr-4 lg:pl-16 lg:pr-36">
        {/* Left — brand content, sitting over the photo's light zone. */}
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
            Espace secrétaire
          </h1>

          <div className="mb-4 mt-3 flex items-center gap-1.5">
            <span className="h-0.5 w-8 rounded-full bg-teal-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          </div>

          <p className="text-sm leading-relaxed text-slate-500">
            La version web de DoctorY : gérez les rendez-vous et les patients,
            depuis n&apos;importe quel appareil.
          </p>

          <div className="mt-8 w-full space-y-3">
            {FEATURES.map(({ icon: Icon, text, tint }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tint}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form card */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
