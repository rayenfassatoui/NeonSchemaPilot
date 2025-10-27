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
  activeId: string | null;
  referencingColumns: Set<string>;
  referencedColumns: Set<string>;
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
  activeId,
  referencingColumns,
  referencedColumns,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  fallbackMargin,
}: DiagramBoardProps) {
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

          return (
            <TableCard
              key={id}
              id={id}
              table={table}
              position={position}
              active={activeId === id}
              registerCard={registerCard}
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
