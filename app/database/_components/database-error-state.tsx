import Link from "next/link";

export function DatabaseErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Database overview
        </p>
        <h1 className="text-balance text-3xl font-semibold">We couldn't inspect that Neon workspace</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-center">
          <Link
            href="/"
            className="rounded-full border border-border/60 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-muted/50"
          >
            Back to hero
          </Link>
        </div>
      </div>
    </div>
  );
}
