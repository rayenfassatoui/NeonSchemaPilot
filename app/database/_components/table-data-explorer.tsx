"use client";

import * as React from "react";

import type { TableInfo } from "@/types/neon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const LIMIT_CHOICES = [10, 25, 50];

type TableDataExplorerProps = {
  connectionParam: string;
  tables: TableInfo[];
};

type TableOption = {
  id: string;
  schema: string;
  name: string;
  label: string;
};

type DataState =
  | { status: "idle"; rows: Record<string, unknown>[]; columns: string[] }
  | { status: "loading"; rows: Record<string, unknown>[]; columns: string[] }
  | { status: "success"; rows: Record<string, unknown>[]; columns: string[] }
  | { status: "error"; rows: Record<string, unknown>[]; columns: string[]; message: string };

export function TableDataExplorer({ connectionParam, tables }: TableDataExplorerProps) {
  const options = React.useMemo<TableOption[]>(
    () =>
      tables.map((table) => ({
        id: `${table.schema}.${table.name}`,
        schema: table.schema,
        name: table.name,
        label: `${table.schema}.${table.name}`,
      })),
    [tables]
  );

  const [selection, setSelection] = React.useState(() => options[0]?.id ?? "");
  const [limit, setLimit] = React.useState<number>(LIMIT_CHOICES[0]);
  const [state, setState] = React.useState<DataState>({ status: "idle", rows: [], columns: [] });

  const abortRef = React.useRef<AbortController | null>(null);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.id === selection) ?? null,
    [options, selection]
  );

  React.useEffect(() => {
    if (!options.length) {
      if (selection !== "") {
        setSelection("");
      }
      return;
    }

    const exists = options.some((option) => option.id === selection);
    if (!exists) {
      setSelection(options[0].id);
    }
  }, [options, selection]);

  const loadData = React.useCallback(
    async (option: TableOption, limitValue: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, status: "loading" }));

      try {
        const response = await fetch("/api/neon/table-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            connectionParam,
            schema: option.schema,
            table: option.name,
            limit: limitValue,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Failed to fetch table data.");
        }

        const payload = (await response.json()) as {
          rows?: unknown;
          columns?: unknown;
        };

        const rows = Array.isArray(payload.rows)
          ? (payload.rows as Record<string, unknown>[])
          : [];
        const columns = Array.isArray(payload.columns)
          ? (payload.columns as string[])
          : [];

        setState({ status: "success", rows, columns });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to fetch table data.";
        setState({ status: "error", rows: [], columns: [], message });
      }
    },
    [connectionParam]
  );

  React.useEffect(() => {
    if (!selectedOption) {
      setState({ status: "idle", rows: [], columns: [] });
      return () => abortRef.current?.abort();
    }

    loadData(selectedOption, limit);

    return () => abortRef.current?.abort();
  }, [limit, loadData, selectedOption]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  if (!options.length) {
    return null;
  }

  const isLoading = state.status === "loading";
  const errorMessage = state.status === "error" ? state.message : null;
  const rowCount = state.rows.length;

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Sample table data</h2>
            <p className="text-sm text-muted-foreground">
              Quickly inspect up to {limit} rows without leaving the schema overview.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selection} onValueChange={setSelection}>
              <SelectTrigger size="sm" className="min-w-[12rem]">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent align="end">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
              <SelectTrigger size="sm" className="w-[6rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {LIMIT_CHOICES.map((choice) => (
                  <SelectItem key={choice} value={String(choice)}>
                    {choice} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="rounded-md px-2.5 py-1 text-xs">
              {isLoading ? "Loading…" : `${rowCount} row${rowCount === 1 ? "" : "s"}`}
            </Badge>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
              <Spinner className="mr-2" /> Fetching data…
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : rowCount === 0 ? (
            <div className="min-h-[160px] rounded-lg border border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              No rows returned. Try inserting data or pick a different table.
            </div>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  {state.columns.map((column) => (
                    <TableHead key={column} className="text-xs uppercase tracking-wide text-muted-foreground">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {state.columns.map((column) => (
                    <TableCell key={column} className="align-top">
                      {formatCellValue(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
      </div>
    </section>
  );
}

function formatCellValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "—";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}
