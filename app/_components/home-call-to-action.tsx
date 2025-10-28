import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HomeCallToAction() {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-3xl border border-border/60 bg-primary/10 p-10 text-center shadow-lg shadow-primary/10 dark:bg-primary/15">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Ready when you are</p>
        <h2 className="text-balance text-3xl font-semibold text-foreground">
          Bring clarity to every schema change conversation
        </h2>
        <p className="text-base text-muted-foreground">
          Spin up a shareable workspace in minutes and keep your team aligned from ideation to rollout. No sales calls, just a secure connection string.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="#hero">Connect with Neon URL</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="h-11 px-6">
            <Link href="https://github.com/rayenfassatoui/NeonSchemaPilot" target="_blank" rel="noreferrer">
              View documentation
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
