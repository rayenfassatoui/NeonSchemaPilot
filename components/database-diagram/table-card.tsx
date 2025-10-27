import * as React from "react";

import { cn } from "@/lib/utils";
import type { TableInfo } from "@/types/neon";

type TableCardProps = {
  id: string;
  table: TableInfo;
  position: { x: number; y: number };
  active: boolean;
  registerCard: (id: string) => (node: HTMLDivElement | null) => void;
  onPointerDown: (id: string) => (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  referencingColumns: Set<string>;
  referencedColumns: Set<string>;
};

export const TableCard = React.memo(function TableCard({
  id,
  table,
  position,
  active,
  registerCard,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  referencingColumns,
  referencedColumns,
}: TableCardProps) {
  const assignRef = React.useMemo(() => registerCard(id), [registerCard, id]);
  const columnsToRender = React.useMemo(() => table.columns.slice(0, 12), [table.columns]);

  return (
    <div
      ref={assignRef}
      data-table-card
      className={cn(
        "absolute flex w-[280px] cursor-grab touch-none select-none",
        active && "cursor-grabbing"
      )}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown(id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg shadow-primary/10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{table.name}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{table.schema}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {table.columns.length} col{table.columns.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="space-y-2 text-xs">
          {columnsToRender.length ? (
            columnsToRender.map((column) => {
              const columnKey = `${table.schema}.${table.name}.${column.name}`;
              const isSource = referencingColumns.has(columnKey);
              const isTarget = referencedColumns.has(columnKey);

              return (
                <div
                  key={column.name}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent px-2 py-1 transition-colors",
                    isSource && "border-primary/30 bg-primary/10",
                    !isSource && isTarget && "border-primary/15 bg-primary/5"
                  )}
                >
                  <span className="font-medium text-foreground">{column.name}</span>
                  <span className="text-muted-foreground">{column.dataType}</span>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No columns</p>
          )}
          {table.columns.length > 12 ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              +{table.columns.length - 12} more columns
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
});
