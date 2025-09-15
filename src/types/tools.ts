import type { CanvasObject } from './objects';

export type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'line' | 'pan';

export interface ToolState {
  activeTool: ToolType;
  isDrawing: boolean;
  previewObject?: CanvasObject;
  startPoint?: { x: number; y: number };
  currentPoint?: { x: number; y: number };
}

export interface ToolConfig {
  type: ToolType;
  name: string;
  icon: string;
  shortcut?: string;
  cursor?: string;
}

export interface DrawingState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  constrainProportions?: boolean; // For Shift key
}

export interface SelectionState {
  selectedIds: string[];
  isSelecting: boolean;
  selectionBox?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  isDragging: boolean;
  dragOffset?: { x: number; y: number };
}

export interface ResizeHandle {
  type: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
  x: number;
  y: number;
  cursor: string;
}