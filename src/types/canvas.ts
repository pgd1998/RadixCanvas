import type { Rectangle } from './base';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  bounds: Rectangle;
}

export interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objectIds: string[];
}