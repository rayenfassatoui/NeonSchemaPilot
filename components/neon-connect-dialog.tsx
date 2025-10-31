"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DescribeResponse } from "@/types/neon";

interface NeonConnectDialogProps {
  onSnapshot?: (payload: DescribeResponse) => void;
}

export function NeonConnectDialog({ onSnapshot }: NeonConnectDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [connectionString, setConnectionString] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<DescribeResponse | null>(null);

  const canSubmit = connectionString.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError(null);

    try {
      const normalizedConnection = connectionString.trim();
      const res = await fetch("/api/neon/describe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionString: normalizedConnection }),
      });

      const payload = (await res.json()) as DescribeResponse & {
        error?: string;
      };

      if (!res.ok || !payload || !("snapshot" in payload)) {
        throw new Error(payload?.error || "We couldn’t inspect that database.");
      }

      setResponse(payload);
      onSnapshot?.(payload);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We couldn’t inspect that database.";
      setError(message);
      setResponse(null);
    } finally {
      setPending(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setPending(false);
      setError(null);
    }
  };

  const headlineSummary = React.useMemo(() => {
    if (!response) return null;
    const { snapshot } = response;
    const tableText = snapshot.tableCount === 1 ? "table" : "tables";
    const columnText = snapshot.columnCount === 1 ? "column" : "columns";
    const relationText = snapshot.relations.length === 1 ? "relation" : "relations";
    return `Found ${snapshot.tableCount} ${tableText}, ${snapshot.columnCount} ${columnText}, and ${snapshot.relations.length} ${relationText}.`;
  }, [response]);

  const encodedConnection = React.useMemo(() => {
    if (!response) return null;
    try {
      return btoa(connectionString.trim());
    } catch {
      return null;
    }
  }, [response, connectionString]);

  React.useEffect(() => {
    if (!response || !encodedConnection) {
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("mydatabase.connection", encodedConnection);
    }

    const existing = searchParams?.get("connection");
    if (existing === encodedConnection) {
      return;
    }

    const params = new URLSearchParams(searchParams ? Array.from(searchParams.entries()) : []);
    params.set("connection", encodedConnection);

    const nextUrl = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [encodedConnection, pathname, response, router, searchParams]);

  const navigateToOverview = () => {
    if (!encodedConnection) return;
    router.push(`/database?connection=${encodeURIComponent(encodedConnection)}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full px-7">
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          Connect with Neon URL
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-8 sm:max-w-xl">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-semibold">
            Share your Neon access
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Paste a Neon Postgres connection string. We'll read the catalog and
            outline every table automatically—no SQL dump needed.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Label htmlFor="neon-url">Neon database URL</Label>
            <Input
              id="neon-url"
              placeholder="postgresql://user:password@ep-skyline-12345.aws.neon.tech/neondb"
              value={connectionString}
              onChange={(event) => setConnectionString(event.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              We only request read access. Rotate credentials at any time from your Neon console.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {response ? (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Schema snapshot</p>
                  <p className="text-xs text-muted-foreground">{headlineSummary}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Read only
                </span>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                {response.snapshot.tables.slice(0, 3).map((table) => (
                  <div key={`${table.schema}.${table.name}`} className="rounded-lg border border-border/40 bg-background/80 px-3 py-2.5">
                    <p className="font-medium text-foreground">
                      {table.schema}.{table.name}
                    </p>
                    {table.columns.length ? (
                      <p>
                        {table.columns.slice(0, 4).map((column, index) => (
                          <span key={column.name}>
                            {column.name}: {column.dataType}
                            {index < Math.min(3, table.columns.length - 1) ? ", " : ""}
                          </span>
                        ))}
                        {table.columns.length > 4 ? "…" : null}
                      </p>
                    ) : (
                      <p>No columns discovered.</p>
                    )}
                  </div>
                ))}
                {response.snapshot.tables.length > 3 ? (
                  <p>…and more tables detected. Full preview generated below.</p>
                ) : null}
                {response.snapshot.relations.length ? (
                  <p className="text-muted-foreground">
                    {response.snapshot.relations.length} foreign key
                    {response.snapshot.relations.length === 1 ? " relation" : " relations"} detected.
                  </p>
                ) : (
                  <p className="text-muted-foreground">No foreign key relations found.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              Encrypted in transit. Nothing executes without your review.
            </div>
            <div className="flex gap-2 sm:justify-end">
              {response && encodedConnection ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={navigateToOverview}
                >
                  View full database
                </Button>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!canSubmit || pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Inspecting…
                  </>
                ) : (
                  "Connect workspace"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
