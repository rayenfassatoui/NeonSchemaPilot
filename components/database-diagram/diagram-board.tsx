import * as React from "react";

import type { TableInfo } from "@/types/neon";

import { RelationLines } from "./relation-lines";
import { TableCard } from "./table-card";
import type { DiagramLine, Positions, ViewportState } from "./types";
import { tableKey } from "./types";

type DiagramBoardProps = {
  dimensions: { width: number; height: number };
  viewport: ViewportState;
  lines: DiagramLine[];
  tables: TableInfo[];
  positions: Positions;
  registerCard: (id: string) => (node: HTMLDivElement | null) => void;
  registerColumnOffset: (columnKey: string, offset: number | null) => void;
  activeId: string | null;
  referencingColumns: Set<string>;
  referencedColumns: Set<string>;
  highlightedTables: Set<string> | null;
  onPointerDown: (id: string) => (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  fallbackMargin: number;
};

export function DiagramBoard({
  dimensions,
  viewport,
  lines,
  tables,
  positions,
  registerCard,
  registerColumnOffset,
  activeId,
  referencingColumns,
  referencedColumns,
  highlightedTables,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  fallbackMargin,
}: DiagramBoardProps) {
  const hasHighlight = highlightedTables != null && highlightedTables.size > 0;

  return (
    <div
      className="absolute inset-0"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        transformOrigin: "0 0",
      }}
    >
      <RelationLines lines={lines} width={dimensions.width} height={dimensions.height} />

      <div className="absolute left-0 top-0">
        {tables.map((table) => {
          const id = tableKey(table);
          const position = positions[id] ?? { x: fallbackMargin, y: fallbackMargin };
          const highlighted = highlightedTables?.has(id) ?? false;
          const dimmed = hasHighlight && !highlighted;

          return (
            <TableCard
              key={id}
              id={id}
              table={table}
              position={position}
              active={activeId === id}
              highlighted={highlighted}
              dimmed={dimmed}
              registerCard={registerCard}
              registerColumnOffset={registerColumnOffset}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerEnd={onPointerEnd}
              referencingColumns={referencingColumns}
              referencedColumns={referencedColumns}
            />
          );
        })}
      </div>
    </div>
  );
}
