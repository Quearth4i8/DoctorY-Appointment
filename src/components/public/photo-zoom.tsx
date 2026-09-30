"use client";

import { ZoomIn } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A profile photo that opens larger, centred, on click.
 *
 * The header thumbnail is 88px — enough to recognise a face you already know,
 * not enough to recognise one you are about to meet. The enlarged view shows
 * the same file at up to its own resolution; how sharp it looks is then down
 * to the photo the profile was given.
 */
export function PhotoZoom({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  /** Sizing and radius of the thumbnail, as on ProviderAvatar. */
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Agrandir la photo de ${name}`}
          className={cn(
            "group relative shrink-0 cursor-zoom-in overflow-hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper-muted",
            className,
          )}
        >
          {/* A plain <img> for the same reason as ProviderAvatar: arbitrary
              remote hosts that next/image would refuse. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 text-white opacity-0 transition-all duration-200 group-hover:bg-foreground/25 group-hover:opacity-100">
            <ZoomIn className="h-6 w-6 drop-shadow" />
          </span>
        </button>
      </DialogTrigger>

      {/* The name sits in a header row beside the dialog's close button, so
          the button never lands on top of the photo. */}
      <DialogContent className="w-auto max-w-[min(92vw,34rem)] gap-3 p-3">
        <DialogTitle className="flex h-10 items-center pl-2 pr-12 text-[0.95rem] font-bold">
          {name}
        </DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="mx-auto block max-h-[75vh] w-full rounded-xl object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
