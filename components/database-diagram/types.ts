import type { TableInfo } from "@/types/neon";

export type Positions = Record<string, { x: number; y: number }>;
export type SizeMap = Record<string, { width: number; height: number }>;
export type ViewportState = { scale: number; x: number; y: number };
export type DiagramLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  highlighted?: boolean;
};

export function tableKey(table: TableInfo) {
  return `${table.schema}.${table.name}`;
}
