
import * as React from "react";

import type { DiagramLine } from "./types";

type RelationLinesProps = {
  lines: DiagramLine[];
  width: number;
  height: number;
};

function buildCurvePath({ x1, y1, x2, y2 }: DiagramLine) {
  if (x1 === x2) {
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} Q ${x1 - 40} ${midY} ${x2} ${y2}`;
  }

  const horizontalDistance = Math.abs(x2 - x1);
  const control = Math.max(60, horizontalDistance * 0.4);
  const direction = x1 < x2 ? 1 : -1;
  const c1x = x1 + control * direction;
  const c2x = x2 - control * direction;
  return `M ${x1} ${y1} C ${c1x} ${y1} ${c2x} ${y2} ${x2} ${y2}`;
}

export function RelationLines({ lines, width, height }: RelationLinesProps) {
  if (!lines.length) {
    return null;
  }

  const hasHighlight = lines.some((line) => line.highlighted);
  const lineColor = "var(--diagram-line, hsl(var(--primary)))";

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ color: lineColor }}
    >
      <defs>
        <marker id="diagram-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={lineColor} />
        </marker>
      </defs>
      <g fill="none" strokeLinecap="round">
        {lines.map((line) => {
          const path = buildCurvePath(line);
          const baseOpacity = line.highlighted ? 1 : hasHighlight ? 0.25 : 0.92;
          const strokeWidth = line.highlighted ? 3.2 : 2.2;
          const glowWidth = strokeWidth + 3.5;

          return (
            <React.Fragment key={line.id}>
              <path
                d={path}
                strokeWidth={glowWidth}
                stroke={lineColor}
                strokeOpacity={Math.min(1, baseOpacity * 0.55)}
                opacity={baseOpacity}
                style={{ mixBlendMode: "multiply" }}
              />
              <path
                d={path}
                strokeWidth={strokeWidth}
                markerEnd="url(#diagram-arrow)"
                stroke={lineColor}
                strokeOpacity={baseOpacity}
              />
              <circle
                cx={line.x1}
                cy={line.y1}
                r={line.highlighted ? 3.2 : 2.8}
                fill={lineColor}
                fillOpacity={baseOpacity}
              />
              <circle
                cx={line.x2}
                cy={line.y2}
                r={line.highlighted ? 3.2 : 2.8}
                fill={lineColor}
                fillOpacity={baseOpacity}
              />
            </React.Fragment>
          );
        })}
      </g>
    </svg>
  );
}
