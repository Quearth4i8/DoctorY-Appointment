"use client";

import Link from "next/link";
import { BadgeCheck, Building2, ChevronDown, LogIn, Store } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * One door for everyone who is not a patient.
 *
 * The header used to carry two: a bordered "Espace professionnel" button and a
 * greyed "Secrétariat" link. That was wrong twice over — the pro button was
 * the loudest thing on a page whose whole job is helping a patient find care,
 * and the secretary link was styled so far down it read as disabled.
 *
 * They also compete for the same answer to the same question: "I'm not here to
 * book an appointment." So they collapse into one restrained trigger, and the
 * three things behind it get equal, legible weight inside the menu instead of
 * fighting each other in the header.
 */
export function ProMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-10 items-center gap-2 rounded-xl border border-input px-3.5 text-sm font-semibold transition-colors hover:bg-paper-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-paper-muted">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">Professionnels</span>
        <span className="sm:hidden">Pro</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[17rem]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-bold">Vous exercez dans la santé ?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Être référencé est gratuit.
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/pro" className="cursor-pointer gap-2.5">
            <Store />
            <span className="flex flex-col">
              <span className="font-semibold">Inscrire mon établissement</span>
              <span className="text-xs text-muted-foreground">
                Cabinet, pharmacie, laboratoire…
              </span>
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/pro/revendiquer?type=revendication"
            className="cursor-pointer gap-2.5"
          >
            <BadgeCheck />
            <span className="flex flex-col">
              <span className="font-semibold">Revendiquer une fiche</span>
              <span className="text-xs text-muted-foreground">
                Elle existe déjà sans vous
              </span>
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Kept last and plainly labelled. There is no patient account on
            DoctorY, so a visitor who reads "Connexion" in a header assumes
            otherwise — naming who it belongs to is what prevents that. */}
        <DropdownMenuItem asChild>
          <Link href="/login" className="cursor-pointer gap-2.5">
            <LogIn />
            <span className="flex flex-col">
              <span className="font-semibold">Connexion secrétariat</span>
              <span className="text-xs text-muted-foreground">
                Agenda et demandes du cabinet
              </span>
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
