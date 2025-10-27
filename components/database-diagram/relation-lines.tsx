
import type { DiagramLine } from "./types";

type RelationLinesProps = {
  lines: DiagramLine[];
  width: number;
  height: number;
};

export function RelationLines({ lines, width, height }: RelationLinesProps) {
  if (!lines.length) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <marker id="diagram-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
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
  );
}
