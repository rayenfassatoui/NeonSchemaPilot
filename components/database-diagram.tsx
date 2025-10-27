"use client";
import * as React from "react";

import { DiagramBoard } from "./database-diagram/diagram-board";
import { ZoomControls } from "./database-diagram/zoom-controls";
import { tableKey } from "./database-diagram/types";
import type {
    DiagramLine,
    Positions,
    SizeMap,
    ViewportState,
} from "./database-diagram/types";
import type { RelationEdge, TableInfo } from "@/types/neon";

const CANVAS_MARGIN = 48;
const COLUMN_SPACING = 320;
const ROW_SPACING = 240;
const DEFAULT_CARD_WIDTH = 280;
const DEFAULT_CARD_HEIGHT = 200;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 1.1;

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
    scale: number;
    translateX: number;
    translateY: number;
  } | null>(null);
  const panState = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [viewport, setViewport] = React.useState<ViewportState>({ scale: 1, x: 0, y: 0 });
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
        const size = { width: node.offsetWidth, height: node.offsetHeight };
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

  const clampPosition = React.useCallback((_: string, x: number, y: number) => ({ x, y }), []);

  const applyZoom = React.useCallback(
    (factor: number, center?: { x: number; y: number }) => {
      setViewport((prev) => {
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, prev.scale * factor)
        );
        if (nextScale === prev.scale) return prev;

        const cx = center?.x ?? canvasSize.width / 2;
        const cy = center?.y ?? canvasSize.height / 2;
        const originX = (cx - prev.x) / prev.scale;
        const originY = (cy - prev.y) / prev.scale;
        const nextX = cx - originX * nextScale;
        const nextY = cy - originY * nextScale;

        return { scale: nextScale, x: nextX, y: nextY };
      });
    },
    [canvasSize.height, canvasSize.width]
  );

  const handleZoomIn = React.useCallback(() => applyZoom(SCALE_STEP), [applyZoom]);
  const handleZoomOut = React.useCallback(
    () => applyZoom(1 / SCALE_STEP),
    [applyZoom]
  );
  const handleResetView = React.useCallback(
    () =>
      setViewport((prev) => {
        if (prev.scale === 1 && prev.x === 0 && prev.y === 0) {
          return prev;
        }
        return { scale: 1, x: 0, y: 0 };
      }),
    []
  );

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const center = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const delta = event.deltaY;
      if (delta === 0) return;

      event.preventDefault();
      event.stopPropagation();

      applyZoom(delta < 0 ? SCALE_STEP : 1 / SCALE_STEP, center);
    },
    [applyZoom]
  );

  const handlePanPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-table-card]")) {
        return;
      }

      if (!containerRef.current) return;

      event.preventDefault();

      panState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [viewport.x, viewport.y]
  );

  const handlePanPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = panState.current;
      if (!state || state.pointerId !== event.pointerId) return;

      event.preventDefault();

      const nextX = state.originX + (event.clientX - state.startX);
      const nextY = state.originY + (event.clientY - state.startY);

      setViewport((prev) => {
        if (prev.x === nextX && prev.y === nextY) {
          return prev;
        }
        return { ...prev, x: nextX, y: nextY };
      });
    },
    []
  );

  const handlePanPointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = panState.current;
      if (!state || state.pointerId !== event.pointerId) return;

      panState.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore if capture was not set.
      }
    },
    []
  );

  const handlePointerDown = React.useCallback(
    (id: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerX =
        (event.clientX - containerRect.left - viewport.x) / viewport.scale;
      const pointerY =
        (event.clientY - containerRect.top - viewport.y) / viewport.scale;
      const current = positions[id] ?? { x: pointerX, y: pointerY };

      dragState.current = {
        id,
        pointerId: event.pointerId,
        offsetX: current.x - pointerX,
        offsetY: current.y - pointerY,
        containerRect,
        scale: viewport.scale,
        translateX: viewport.x,
        translateY: viewport.y,
      };

      setActiveId(id);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [positions, viewport.scale, viewport.x, viewport.y]
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (!state || state.pointerId !== event.pointerId) return;

      event.preventDefault();
      event.stopPropagation();

      const pointerX =
        (event.clientX - state.containerRect.left - state.translateX) /
        state.scale;
      const pointerY =
        (event.clientY - state.containerRect.top - state.translateY) /
        state.scale;
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
    event.stopPropagation();
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

  const boardDimensions = React.useMemo(() => {
    let maxX = canvasSize.width;
    let maxY = canvasSize.height;

    tables.forEach((table) => {
      const id = tableKey(table);
      const position = positions[id];
      if (!position) return;

      const size = cardSizes[id] ?? {
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
      };

      maxX = Math.max(maxX, position.x + size.width + CANVAS_MARGIN);
      maxY = Math.max(maxY, position.y + size.height + CANVAS_MARGIN);
    });

    return {
      width: Math.max(canvasSize.width, Math.ceil(maxX)),
      height: Math.max(canvasSize.height, Math.ceil(maxY)),
    };
  }, [tables, positions, cardSizes, canvasSize.width, canvasSize.height]);

  const lines = React.useMemo<DiagramLine[]>(() => {
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
      .filter(Boolean) as DiagramLine[];
  }, [relations, positions, cardSizes]);

  return (
    <div
      ref={containerRef}
      className="relative isolate w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/20"
      style={{ height: defaultHeight }}
      onWheel={handleWheel}
      onPointerDown={handlePanPointerDown}
      onPointerMove={handlePanPointerMove}
      onPointerUp={handlePanPointerEnd}
      onPointerCancel={handlePanPointerEnd}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.border/10),transparent_65%)]" />

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetView} />

      <DiagramBoard
        dimensions={boardDimensions}
        viewport={viewport}
        lines={lines}
        tables={tables}
        positions={positions}
        registerCard={registerCard}
        activeId={activeId}
        referencingColumns={referencingColumns}
        referencedColumns={referencedColumns}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerEnd={finalizeDrag}
        fallbackMargin={CANVAS_MARGIN}
      />
    </div>
  );
}
