"use client";

import * as React from "react";

import { DatabaseDiagram } from "@/components/database-diagram";
import { tableKey } from "@/components/database-diagram/types";
import type { RelationEdge, TableInfo } from "@/types/neon";

import { RelationExplorer } from "./relation-explorer";

type VisualExplorerProps = {
  tables: TableInfo[];
  relations: RelationEdge[];
};

export function VisualExplorer({ tables, relations }: VisualExplorerProps) {
  const [selectedTableId, setSelectedTableId] = React.useState(() => tables[0]?.schema ? tableKey(tables[0]) : "");

  const tableIds = React.useMemo(() => tables.map((table) => tableKey(table)), [tables]);

  React.useEffect(() => {
    if (!tableIds.length) {
      setSelectedTableId("");
      return;
    }

    if (!selectedTableId) {
      setSelectedTableId(tableIds[0]);
      return;
    }

    if (!tableIds.includes(selectedTableId)) {
      setSelectedTableId(tableIds[0]);
    }
  }, [selectedTableId, tableIds]);

  const focus = React.useMemo(() => {
    if (!selectedTableId) {
      return null;
    }

    const tablesSet = new Set<string>([selectedTableId]);
    const sourceColumns = new Set<string>();
    const targetColumns = new Set<string>();
    const relationIds = new Set<string>();

    relations.forEach((relation) => {
      const sourceId = `${relation.source.schema}.${relation.source.table}`;
      const targetId = `${relation.target.schema}.${relation.target.table}`;
      const relationId = `${relation.constraintName}-${sourceId}-${targetId}`;

      if (sourceId === selectedTableId) {
        tablesSet.add(targetId);
        relationIds.add(relationId);
        sourceColumns.add(`${relation.source.schema}.${relation.source.table}.${relation.source.column}`);
        if (relation.target.column) {
          targetColumns.add(`${relation.target.schema}.${relation.target.table}.${relation.target.column}`);
        }
      } else if (targetId === selectedTableId) {
        tablesSet.add(sourceId);
        relationIds.add(relationId);
        sourceColumns.add(`${relation.source.schema}.${relation.source.table}.${relation.source.column}`);
        if (relation.target.column) {
          targetColumns.add(`${relation.target.schema}.${relation.target.table}.${relation.target.column}`);
        }
      }
    });

    return {
      tables: tablesSet,
      sourceColumns,
      targetColumns,
      relationIds,
    };
  }, [relations, selectedTableId]);

  const handleTableFocus = React.useCallback((id: string) => {
    setSelectedTableId(id);
  }, []);

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Canvas playground</h2>
            <p className="text-sm text-muted-foreground">
              Use drag, pan, or wheel zoom to sculpt the diagram. Your layout is kept per schema snapshot.
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {relations.length} relation{relations.length === 1 ? "" : "s"}
          </span>
        </div>
        <DatabaseDiagram tables={tables} relations={relations} focus={focus} onTableFocus={handleTableFocus} />
      </section>
      {relations.length ? (
        <RelationExplorer
          tables={tables}
          relations={relations}
          selectedTableId={selectedTableId}
          onSelectedTableChange={setSelectedTableId}
        />
      ) : null}
    </>
  );
}
