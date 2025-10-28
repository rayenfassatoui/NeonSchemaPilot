"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_REPO = "rayenfassatoui/NeonSchemaPilot";

interface GithubStarButtonProps {
  repo?: string;
  className?: string;
}

export function GithubStarButton({ repo = DEFAULT_REPO, className }: GithubStarButtonProps) {
  const [stars, setStars] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchStars() {
      try {
        setLoading(true);
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          signal: controller.signal,
          headers: { Accept: "application/vnd.github+json" },
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const data = (await response.json()) as { stargazers_count?: number };

        if (!cancelled) {
          setStars(typeof data.stargazers_count === "number" ? data.stargazers_count : null);
        }
      } catch {
        if (!cancelled) {
          setStars(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStars();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [repo]);

  const countLabel = stars !== null ? stars.toLocaleString() : loading ? "..." : "0";

  return (
    <Link
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Star MyDatabase Studio on GitHub"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-border hover:text-foreground",
        className
      )}
    >
      <Star className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span className="tracking-tight">Star</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{countLabel}</span>
    </Link>
  );
}
