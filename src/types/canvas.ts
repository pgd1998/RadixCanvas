export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  bounds: Rectangle;
}

export interface CanvasState {
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: ViewportState;
  tool: ToolState;
  layers: LayerInfo[];
}

export interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objectIds: string[];
}