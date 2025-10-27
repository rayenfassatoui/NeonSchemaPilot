"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

type NavHighlight = {
  label: string;
  href: string;
  hint: string;
};

const ROUTE_HIGHLIGHTS: NavHighlight[] = [
  { label: "Visual layout", href: "/database/visual", hint: "Canvas" },
  { label: "Tables view", href: "/database/tables", hint: "Ledger" },
  { label: "SQL preview", href: "/database/sql", hint: "Snapshot" },
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
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 32, y: 32 });

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const connectionParam = searchParams?.get("connection") ?? "";

  const appendConnection = React.useCallback(
    (href: string) => {
      if (!connectionParam || !href.startsWith("/")) {
        return href;
      }
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}connection=${encodeURIComponent(connectionParam)}`;
    },
    [connectionParam]
  );

  const pathSegments = React.useMemo(() => formatPath(pathname ?? "/"), [pathname]);

  const showNav = !collapsed || hovering;

  React.useEffect(() => {
    if (!collapsed) {
      setHovering(false);
    }
  }, [collapsed]);

  const clampPosition = React.useCallback((x: number, y: number) => {
    const node = containerRef.current;
    if (!node) {
      return { x, y };
    }
    const rect = node.getBoundingClientRect();
    const padding = 16;
    const maxX = Math.max(padding, window.innerWidth - rect.width - padding);
    const maxY = Math.max(padding, window.innerHeight - rect.height - padding);
    return {
      x: Math.min(Math.max(padding, x), maxX),
      y: Math.min(Math.max(padding, y), maxY),
    };
  }, []);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const handle = (event.target as HTMLElement).closest("[data-drag-handle]");
      if (!handle) return;
      const node = containerRef.current;
      if (!node) return;

      event.preventDefault();

      const rect = node.getBoundingClientRect();
      dragState.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // ignore capture errors
      }
    },
    []
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (!state || state.pointerId !== event.pointerId) return;

      event.preventDefault();

      const next = clampPosition(event.clientX - state.offsetX, event.clientY - state.offsetY);
      setPosition(next);
    },
    [clampPosition]
  );

  const endDrag = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    dragState.current = null;
    if (node) {
      try {
        node.releasePointerCapture(event.pointerId);
      } catch {
        // ignore release errors
      }
    }
  }, []);

  const handleMouseEnter = React.useCallback(() => {
    if (collapsed) {
      setHovering(true);
    }
  }, [collapsed]);

  const handleMouseLeave = React.useCallback(() => {
    if (collapsed) {
      setHovering(false);
    }
  }, [collapsed]);

  const handleCollapse = React.useCallback(() => {
    setCollapsed(true);
    setHovering(false);
  }, []);

  const handleExpand = React.useCallback(() => {
    setCollapsed(false);
    setHovering(false);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  const highlightCards = (
    <section className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
      {ROUTE_HIGHLIGHTS.map((item) => {
        const href = appendConnection(item.href);
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={href}
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
  );

  const compactHighlights = (
    <div className="flex flex-wrap gap-2 text-xs" id="site-navbar-highlights">
      {ROUTE_HIGHLIGHTS.map((item) => {
        const href = appendConnection(item.href);
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={href}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              isActive
                ? "border-primary text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex touch-none select-none"
      style={{ top: position.y, left: position.x }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showNav ? (
        <nav className="flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-border/50 bg-background/90 p-4 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/60 text-sm font-semibold text-primary-foreground shadow-inner shadow-primary/50"
                data-drag-handle
                aria-label="Drag navigation"
                onClick={collapsed ? handleExpand : undefined}
              >
                DB
              </button>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight">Neon Flowwork</p>
                <p className="text-xs text-muted-foreground">Crafting clarity for complex schemas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={collapsed ? handleExpand : handleCollapse}>
                {collapsed ? "Expand" : "Collapse"}
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link href="https://status.neon.tech" target="_blank" rel="noreferrer">
                  Status
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={appendConnection("/database/visual")}>Open diagram</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/">Connect new URL</Link>
              </Button>
            </div>
          </div>
          {!collapsed && <Separator className="hidden sm:block" />}
          {collapsed ? (
            compactHighlights
          ) : (
            <>
              {highlightCards}
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
                    Share the diagram views so teammates can drag tables, annotate relations, and export context.
                  </p>
                  <Button variant="ghost" size="sm" className="mt-3 self-start" asChild>
                    <Link href="mailto:?subject=Share%20database%20diagram&body=Take%20a%20look%20at%20our%20Neon%20schema%20overview">Send invite</Link>
                  </Button>
                </div>
              </section>
            </>
          )}
        </nav>
      ) : (
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/60 text-sm font-semibold text-primary-foreground shadow-inner shadow-primary/50"
          data-drag-handle
          aria-label="Open navigation"
          onClick={handleExpand}
        >
          DB
        </button>
      )}
    </div>
  );
}
