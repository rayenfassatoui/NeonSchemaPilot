"use client";

import Link from "next/link";
import { Github } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

import { GithubStarButton } from "./github-star-button";

interface HomeHeaderProps {
  className?: string;
}

export function HomeHeader({ className }: HomeHeaderProps) {
  return (
    <header className={cn("mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-12", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border/60 bg-primary/5 text-sm font-semibold uppercase tracking-widest text-primary dark:bg-primary/10">
          DB
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold tracking-tight">MyDatabase Studio</span>
          <span className="text-xs text-muted-foreground">Share context, not chaos</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
        <GithubStarButton />
        <Link
          href="https://github.com/rayenfassatoui/NeonSchemaPilot"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 transition-colors hover:border-border hover:text-foreground"
          aria-label="View Neon Schema Pilot on GitHub"
        >
          <Github className="h-5 w-5" aria-hidden="true" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
