import type { CanvasObject } from './objects';
import type { ViewportState, LayerInfo } from './canvas';
import type { ToolState } from './tools';

export interface CanvasState {
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: ViewportState;
  tool: ToolState;
  layers: LayerInfo[];
}