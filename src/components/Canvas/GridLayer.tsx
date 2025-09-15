import type { JSX } from 'react';
import type { ViewportState } from '../../types/canvas';

interface GridLayerProps {
  viewport: ViewportState;
  gridSize?: number;
  showGrid?: boolean;
}

export function GridLayer({ viewport, gridSize = 20, showGrid = true }: GridLayerProps) {
  if (!showGrid || viewport.zoom < 0.5) {
    return null;
  }

  const scaledGridSize = gridSize * viewport.zoom;
  
  // Don't show grid if it would be too dense
  if (scaledGridSize < 10) {
    return null;
  }

  const offsetX = viewport.x % scaledGridSize;
  const offsetY = viewport.y % scaledGridSize;

  const lines: JSX.Element[] = [];

  // Vertical lines
  for (let x = offsetX; x < window.innerWidth; x += scaledGridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={window.innerHeight}
        stroke="rgba(0, 0, 0, 0.1)"
        strokeWidth="1"
      />
    );
  }

  // Horizontal lines
  for (let y = offsetY; y < window.innerHeight; y += scaledGridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={window.innerWidth}
        y2={y}
        stroke="rgba(0, 0, 0, 0.1)"
        strokeWidth="1"
      />
    );
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height="100%"
      style={{ zIndex: 1 }}
    >
      {lines}
    </svg>
  );
}