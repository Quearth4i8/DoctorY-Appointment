/** Shown to a signed-in user who is not on the DoctorY staff allowlist. */
export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-7 text-center shadow-sm">
        <h1 className="text-lg font-bold text-foreground">Accès non autorisé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce compte n&apos;est pas rattaché à DoctorY. Contactez le médecin pour
          qu&apos;il vous ajoute.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button
            type="submit"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
