"use client";

import * as React from "react";

import type { RelationEdge, TableInfo } from "@/types/neon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type RelationExplorerProps = {
  tables: TableInfo[];
  relations: RelationEdge[];
  selectedTableId?: string | null;
  onSelectedTableChange?: (id: string) => void;
};

type TableOption = {
  id: string;
  schema: string;
  name: string;
  label: string;
};

type GroupedRelations = {
  outgoing: RelationEdge[];
  incoming: RelationEdge[];
};

export function RelationExplorer({ tables, relations, selectedTableId, onSelectedTableChange }: RelationExplorerProps) {
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

  const isControlled = selectedTableId !== undefined;
  const [internalSelection, setInternalSelection] = React.useState(options[0]?.id ?? "");

  const selection = isControlled ? selectedTableId ?? "" : internalSelection;

  const commitSelection = React.useCallback(
    (value: string) => {
      if (!isControlled) {
        setInternalSelection(value);
      }
      onSelectedTableChange?.(value);
    },
    [isControlled, onSelectedTableChange]
  );

  const selected = React.useMemo(
    () => options.find((option) => option.id === selection) ?? null,
    [options, selection]
  );

  React.useEffect(() => {
    if (!options.length) {
      if (!isControlled) {
        setInternalSelection("");
      }
      return;
    }

    const exists = options.some((option) => option.id === selection);
    if (!exists) {
      const next = options[0].id;
      if (!isControlled) {
        setInternalSelection(next);
      }
      onSelectedTableChange?.(next);
    }
  }, [options, selection, isControlled, onSelectedTableChange]);

  const grouped = React.useMemo<GroupedRelations>(() => {
    if (!selected) {
      return { outgoing: [], incoming: [] };
    }

    const outgoing = relations.filter(
      (relation) =>
        relation.source.schema === selected.schema && relation.source.table === selected.name
    );

    const incoming = relations.filter(
      (relation) =>
        relation.target.schema === selected.schema && relation.target.table === selected.name
    );

    return { outgoing, incoming };
  }, [relations, selected]);

  if (!options.length) {
    return null;
  }

  const totalRelations = grouped.outgoing.length + grouped.incoming.length;

  return (
    <section className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Relation explorer</h2>
          <p className="text-sm text-muted-foreground">
            Inspect inbound and outbound foreign keys for any table in the snapshot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selection} onValueChange={commitSelection}>
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
          <Badge variant="secondary" className="rounded-md px-2.5 py-1 text-xs">
            {totalRelations} relation{totalRelations === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <RelationColumn
          title="Outgoing links"
          empty="This table does not reference other tables."
          relations={grouped.outgoing}
          direction="outgoing"
        />
        <RelationColumn
          title="Incoming links"
          empty="No foreign keys point to this table."
          relations={grouped.incoming}
          direction="incoming"
        />
      </div>
    </section>
  );
}

type RelationColumnProps = {
  title: string;
  empty: string;
  relations: RelationEdge[];
  direction: "incoming" | "outgoing";
};

function RelationColumn({ title, empty, relations, direction }: RelationColumnProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wide">
          {relations.length}
        </Badge>
      </div>
      {relations.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {relations.map((relation) => {
            const key = `${relation.constraintName}-${relation.source.table}-${relation.source.column}-${relation.target.table}-${relation.target.column}`;
            const isOutgoing = direction === "outgoing";
            const sourceLabel = `${relation.source.schema}.${relation.source.table}.${relation.source.column}`;
            const targetLabel = `${relation.target.schema}.${relation.target.table}${relation.target.column ? `.${relation.target.column}` : ""}`;

            return (
              <li key={key} className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                <p className="font-medium text-foreground">
                  {isOutgoing ? sourceLabel : targetLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOutgoing ? "→" : "←"} {isOutgoing ? targetLabel : sourceLabel}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {relation.constraintName}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
