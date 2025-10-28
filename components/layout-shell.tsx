"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { SiteNavbar } from "./site-navbar";

type LayoutShellProps = {
  children: React.ReactNode;
};

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  const showNavbar = pathname !== "/";

  return (
    <div className="relative flex min-h-screen flex-col">
      {showNavbar ? (
        <React.Suspense fallback={null}>
          <SiteNavbar />
        </React.Suspense>
      ) : null}
      <main className={cn("flex-1", showNavbar ? "pb-16 pt-28" : "")}>{children}</main>
    </div>
  );
}
