"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { NeonConnectDialog } from "@/components/neon-connect-dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { DescribeResponse } from "@/types/neon";

interface HomeHeroProps {
  summaryLabel: string;
  sqlPreview: string;
  onSnapshot: (payload: DescribeResponse) => void;
}

export function HomeHero({ summaryLabel, sqlPreview, onSnapshot }: HomeHeroProps) {
  return (
    <section className="grid gap-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" id="hero">
      <div className="space-y-10">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-sm">
            Neon ready
            <span className="h-1 w-1 rounded-full bg-primary" />
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Connect your database effortlessly
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Drop in a Neon connection string and instantly spin up a workspace that pairs human-friendly context with reliable SQL truth. No dumps, no migrations, just clarity.
          </p>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary/80" />
            <p className="leading-relaxed">
              We inspect your schema securely and generate a snapshot you can share without exposing credentials or production data.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary/60" />
            <p className="leading-relaxed">
              Give teammates a single URL with visual canvases, tables, and SQL views so they can explore on their own terms.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <NeonConnectDialog onSnapshot={onSnapshot} />
          <Link
            href="#workflow"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See how sharing works
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Built with Bun, Next.js, and shadcn/ui so onboarding stays fast and familiar.
        </p>
      </div>
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/60 shadow-xl shadow-primary/5 backdrop-blur-2xl dark:border-border/40">
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-primary/10 via-transparent to-transparent dark:from-primary/15" />
        <CardContent className="relative space-y-6 pb-8 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">SQL preview</span>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {summaryLabel}
            </span>
          </div>
          <pre className="max-h-[320px] overflow-hidden whitespace-pre-wrap rounded-xl border border-border/40 bg-muted/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground shadow-inner">
{sqlPreview}
          </pre>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Neon cluster: <span className="font-medium text-foreground">nyc1</span>
            </span>
            <span>
              Last checked: <span className="font-medium text-foreground">moments ago</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
