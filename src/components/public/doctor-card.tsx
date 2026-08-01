import Link from "next/link";
import { ArrowRight, MapPin, Stethoscope } from "lucide-react";

import { initials } from "@/lib/avatar";
import type { Doctor } from "@/types";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const name = `${doctor.title} ${doctor.full_name}`.trim();
  const place = [doctor.address, doctor.city].filter(Boolean).join(", ");

  return (
    <Link
      href={`/medecins/${doctor.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg"
    >
      <div className="flex items-center gap-4">
        {doctor.photo_url ? (
          // Profile photos are arbitrary remote URLs, so a plain <img> avoids
          // having to allowlist every host in next.config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.photo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-base font-semibold text-teal-700">
            {initials(doctor.full_name, "") || "Dr"}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-800">
            {name}
          </p>
          {doctor.specialty ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-teal-700">
              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
              {doctor.specialty}
            </p>
          ) : null}
        </div>
      </div>

      {doctor.bio ? (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {doctor.bio}
        </p>
      ) : null}

      {place ? (
        <p className="mt-4 flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{place}</span>
        </p>
      ) : null}

      <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-teal-600">
        Voir le profil
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
