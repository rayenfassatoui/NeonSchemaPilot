"use client";

import * as React from "react";

import type { RelationEdge, TableInfo } from "@/types/neon";
import { cn } from "@/lib/utils";

const CANVAS_MARGIN = 48;
const COLUMN_SPACING = 320;
const ROW_SPACING = 240;
const DEFAULT_CARD_WIDTH = 280;
const DEFAULT_CARD_HEIGHT = 200;

type Positions = Record<string, { x: number; y: number }>;
type SizeMap = Record<string, { width: number; height: number }>;

function tableKey(table: TableInfo) {
  return `${table.schema}.${table.name}`;
}

function buildInitialPositions(tables: TableInfo[]): Positions {
  if (!tables.length) return {};

  const columns = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const positions: Positions = {};

  tables.forEach((table, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions[tableKey(table)] = {
      x: CANVAS_MARGIN + column * COLUMN_SPACING,
      y: CANVAS_MARGIN + row * ROW_SPACING,
    };
  });

  return positions;
}

type DatabaseDiagramProps = {
  tables: TableInfo[];
  relations: RelationEdge[];
};

export function DatabaseDiagram({ tables, relations }: DatabaseDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = React.useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    containerRect: DOMRect;
  } | null>(null);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [positions, setPositions] = React.useState<Positions>(() =>
    buildInitialPositions(tables)
  );
  const [cardSizes, setCardSizes] = React.useState<SizeMap>({});
  const [canvasSize, setCanvasSize] = React.useState({ width: 1200, height: 800 });

  const defaultHeight = React.useMemo(() => {
    if (!tables.length) return 480;
    const rows = Math.max(1, Math.ceil(tables.length / Math.max(1, Math.ceil(Math.sqrt(tables.length)))));
    return Math.max(640, rows * ROW_SPACING + CANVAS_MARGIN * 2);
  }, [tables.length]);

  const tableIds = React.useMemo(() => new Set(tables.map(tableKey)), [tables]);

  React.useEffect(() => {
    setPositions((prev) => {
      const next: Positions = { ...prev };
      const seeded = buildInitialPositions(tables);

      for (const id of tableIds) {
        if (!next[id]) {
          next[id] = seeded[id];
        }
      }

      for (const id of Object.keys(next)) {
        if (!tableIds.has(id)) {
          delete next[id];
        }
      }

      return next;
    });
  }, [tables, tableIds]);

  const measureCards = React.useCallback(() => {
    setCardSizes((prev) => {
      const next: SizeMap = {};
      let changed = false;

      cardRefs.current.forEach((node, id) => {
        const rect = node.getBoundingClientRect();
        const size = { width: rect.width, height: rect.height };
        next[id] = size;

        const prevSize = prev[id];
        if (!prevSize) {
          changed = true;
        } else if (
          Math.abs(prevSize.width - size.width) > 0.5 ||
          Math.abs(prevSize.height - size.height) > 0.5
        ) {
          changed = true;
        }
      });

      if (!changed) {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          changed = true;
        } else {
          for (const key of prevKeys) {
            if (!(key in next)) {
              changed = true;
              break;
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const registerCard = React.useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) {
        const existing = cardRefs.current.get(id);
        cardRefs.current.set(id, node);
        if (existing !== node) {
          measureCards();
        }
      } else {
        if (cardRefs.current.delete(id)) {
          measureCards();
        }
      }
    },
    [measureCards]
  );

  React.useLayoutEffect(() => {
    measureCards();
  }, [measureCards, tables]);

  React.useEffect(() => {
    const handleResize = () => measureCards();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measureCards]);

  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const clampPosition = React.useCallback(
    (id: string, x: number, y: number) => {
      const size = cardSizes[id] ?? {
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
      };

      const minX = CANVAS_MARGIN;
      const minY = CANVAS_MARGIN;
      const maxX = Math.max(canvasSize.width - size.width - CANVAS_MARGIN, minX);
      const maxY = Math.max(canvasSize.height - size.height - CANVAS_MARGIN, minY);

      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    },
    [cardSizes, canvasSize.height, canvasSize.width]
  );

  const handlePointerDown = React.useCallback(
    (id: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerX = event.clientX - containerRect.left;
      const pointerY = event.clientY - containerRect.top;
      const current = positions[id] ?? { x: pointerX, y: pointerY };

      dragState.current = {
        id,
        pointerId: event.pointerId,
        offsetX: current.x - pointerX,
        offsetY: current.y - pointerY,
        containerRect,
      };

      setActiveId(id);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [positions]
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (!state || state.pointerId !== event.pointerId) return;

      event.preventDefault();

      const pointerX = event.clientX - state.containerRect.left;
      const pointerY = event.clientY - state.containerRect.top;
      const rawX = pointerX + state.offsetX;
      const rawY = pointerY + state.offsetY;

      setPositions((prev) => {
        const nextPosition = clampPosition(state.id, rawX, rawY);
        const current = prev[state.id];
        if (current && current.x === nextPosition.x && current.y === nextPosition.y) {
          return prev;
        }
        return { ...prev, [state.id]: nextPosition };
      });
    },
    [clampPosition]
  );

  const finalizeDrag = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    dragState.current = null;
    setActiveId(null);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if capture was not set.
    }
  }, []);

  const referencingColumns = React.useMemo(() => {
    const set = new Set<string>();
    relations.forEach((relation) => {
      const key = `${relation.source.schema}.${relation.source.table}.${relation.source.column}`;
      set.add(key);
    });
    return set;
  }, [relations]);

  const referencedColumns = React.useMemo(() => {
    const set = new Set<string>();
    relations.forEach((relation) => {
      if (!relation.target.column) return;
      const key = `${relation.target.schema}.${relation.target.table}.${relation.target.column}`;
      set.add(key);
    });
    return set;
  }, [relations]);

  const lines = React.useMemo(() => {
    return relations
      .map((relation) => {
        const sourceId = `${relation.source.schema}.${relation.source.table}`;
        const targetId = `${relation.target.schema}.${relation.target.table}`;
        const sourcePos = positions[sourceId];
        const targetPos = positions[targetId];
        if (!sourcePos || !targetPos) return null;

        const sourceSize = cardSizes[sourceId] ?? {
          width: DEFAULT_CARD_WIDTH,
          height: DEFAULT_CARD_HEIGHT,
        };
        const targetSize = cardSizes[targetId] ?? {
          width: DEFAULT_CARD_WIDTH,
          height: DEFAULT_CARD_HEIGHT,
        };

        return {
          id: `${relation.constraintName}-${sourceId}-${targetId}`,
          x1: sourcePos.x + sourceSize.width / 2,
          y1: sourcePos.y + sourceSize.height / 2,
          x2: targetPos.x + targetSize.width / 2,
          y2: targetPos.y + targetSize.height / 2,
        };
      })
      .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
  }, [relations, positions, cardSizes]);

  return (
    <div
      ref={containerRef}
      className="relative isolate w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/20"
      style={{ height: defaultHeight }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="diagram-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        <g stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round">
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              markerEnd="url(#diagram-arrow)"
              className="opacity-70"
            />
          ))}
        </g>
      </svg>
      {tables.map((table) => {
        const id = tableKey(table);
        const position = positions[id] ?? { x: CANVAS_MARGIN, y: CANVAS_MARGIN };
        return (
          <div
            key={id}
            ref={registerCard(id)}
            className={cn(
              "absolute flex w-[280px] cursor-grab touch-none select-none",
              activeId === id && "cursor-grabbing"
            )}
            style={{ left: position.x, top: position.y }}
            onPointerDown={handlePointerDown(id)}
            onPointerMove={handlePointerMove}
            onPointerUp={finalizeDrag}
            onPointerCancel={finalizeDrag}
          >
            <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg shadow-primary/10 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{table.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {table.schema}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {table.columns.length} col{table.columns.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {table.columns.length ? (
                  table.columns.slice(0, 12).map((column) => {
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
      })}
    </div>
  );
}
