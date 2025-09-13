import { Rectangle, Transform } from './canvas';

export type ObjectType = 'rectangle' | 'circle' | 'text' | 'line';

export interface ObjectStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  // Type-specific properties
  cornerRadius?: number; // Rectangle
  fontSize?: number;     // Text
  fontFamily?: string;   // Text
  textAlign?: 'left' | 'center' | 'right'; // Text
}

export interface CanvasObject {
  id: string;
  type: ObjectType;
  bounds: Rectangle;
  style: ObjectStyle;
  transform: Transform;
  layer: number;
  visible: boolean;
  locked: boolean;
  isDirty: boolean; // Performance optimization flag
  // Type-specific data
  text?: string;     // Text objects
  points?: Point[];  // Line objects
}

export interface Point {
  x: number;
  y: number;
}

export interface TextObject extends CanvasObject {
  type: 'text';
  text: string;
}

export interface LineObject extends CanvasObject {
  type: 'line';
  points: Point[];
}

export interface RectangleObject extends CanvasObject {
  type: 'rectangle';
}

export interface CircleObject extends CanvasObject {
  type: 'circle';
}