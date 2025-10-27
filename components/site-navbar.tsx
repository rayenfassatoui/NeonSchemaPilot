"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const ROUTE_HIGHLIGHTS: Array<{ label: string; href: string; hint: string }> = [
  { label: "Welcome", href: "/", hint: "Start here" },
  { label: "Database", href: "/database", hint: "Visual overview" },
  { label: "Docs", href: "https://neon.tech/docs", hint: "Official guides" },
];

function formatPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return ["home"];
  }
  return segments;
}

export function SiteNavbar() {
  const pathname = usePathname();
  const pathSegments = React.useMemo(() => formatPath(pathname ?? "/"), [pathname]);

  return (
    <header className="sticky top-4 z-50 flex w-full justify-center px-4">
      <nav className="flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-border/50 bg-background/80 p-4 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/60 text-sm font-semibold text-primary-foreground shadow-inner shadow-primary/50">
              DB
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Neon Flowwork</p>
              <p className="text-xs text-muted-foreground">Crafting clarity for complex schemas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="https://status.neon.tech" target="_blank" rel="noreferrer">
                Status
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/database">Open diagram</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/">Connect new URL</Link>
            </Button>
          </div>
        </div>

        <Separator className="hidden sm:block" />

        <section className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          {ROUTE_HIGHLIGHTS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-border/60 bg-muted/40 p-3 transition duration-200 hover:border-primary/40 hover:bg-background/80"
              >
                <p className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  {item.label}
                  <span className="rounded-full bg-primary/15 px-2 py-px text-[10px] font-semibold text-primary group-hover:bg-primary/20">
                    {item.hint}
                  </span>
                </p>
                <p className="mt-2 text-sm font-medium text-foreground group-hover:text-primary">
                  {isActive ? "Currently exploring" : "Jump in"}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-3 text-[11px] sm:grid-cols-3">
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-3">
            <p className="uppercase tracking-wide text-muted-foreground">Current route</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              /{pathSegments.join("/")}
            </p>
            <p className="mt-3 text-muted-foreground">
              We preserve your canvas layout per schema so you always resume where you left off.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="uppercase tracking-wide text-muted-foreground">Recent activity</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-center justify-between text-muted-foreground">
                <span>Preview refreshed</span>
                <span className="font-semibold text-foreground">2m ago</span>
              </li>
              <li className="flex items-center justify-between text-muted-foreground">
                <span>Relations mapped</span>
                <span className="font-semibold text-foreground">5 tables</span>
              </li>
              <li className="flex items-center justify-between text-muted-foreground">
                <span>SQL snapshot</span>
                <span className="font-semibold text-foreground">Updated</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 p-3 text-muted-foreground">
            <p className="uppercase tracking-wide">Next recommended step</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Invite your teammate</p>
            <p className="mt-2">
              Share the visual diagram so teammates can drag tables, annotate relations, and export context.
            </p>
            <Button variant="ghost" size="sm" className="mt-3 self-start" asChild>
              <Link href="mailto:?subject=Share%20database%20diagram&body=Take%20a%20look%20at%20our%20Neon%20schema%20overview">Send invite</Link>
            </Button>
          </div>
        </section>
      </nav>
    </header>
  );
}
