// Export all types from a single entry point
export * from './canvas';
export * from './objects';
export * from './tools';

// Additional utility types
export interface ExportOptions {
  format: 'png' | 'svg' | 'json';
  quality?: number; // For PNG
  transparent?: boolean;
  selectedOnly?: boolean;
  customDimensions?: {
    width: number;
    height: number;
  };
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  objectCount: number;
  visibleObjectCount: number;
  memoryUsage?: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
}