/**
 * Performance monitoring and optimization utilities
 */
import React from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  objectCount: number;
  renderTime: number;
  lastUpdate: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private frameTimeSum = 0;
  private renderTimeSum = 0;
  private renderTimeCount = 0;
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    objectCount: 0,
    renderTime: 0,
    lastUpdate: 0
  };

  private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  // Subscribe to performance updates
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Measure FPS and frame time
  measureFrame() {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    
    this.frameCount++;
    this.frameTimeSum += deltaTime;

    // Update metrics every second
    if (deltaTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.metrics.frameTime = this.frameTimeSum / this.frameCount;
      this.metrics.lastUpdate = now;

      // Reset counters
      this.frameCount = 0;
      this.frameTimeSum = 0;
      this.lastTime = now;

      this.notifySubscribers();
    }
  }

  // Measure render time
  startRenderMeasurement(): () => void {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      this.renderTimeSum += renderTime;
      this.renderTimeCount++;
      
      // Update average render time
      this.metrics.renderTime = this.renderTimeSum / this.renderTimeCount;
      
      // Reset averages periodically
      if (this.renderTimeCount >= 60) {
        this.renderTimeSum = renderTime;
        this.renderTimeCount = 1;
      }
    };
  }

  // Measure memory usage
  updateMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576); // MB
    }
  }

  // Update object count
  updateObjectCount(count: number) {
    this.metrics.objectCount = count;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Check if performance is below targets
  isPerformancePoor(): boolean {
    return this.metrics.fps < 45 || this.metrics.renderTime > 20;
  }

  private notifySubscribers() {
    this.callbacks.forEach(callback => callback(this.metrics));
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Throttle function for event handling
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return ((...args: any[]) => {
    if (!lastRan) {
      func.apply(null, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(null, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  }) as T;
}

// Debounce function for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
}

// Viewport culling utility
export function isObjectInViewport(
  objectBounds: { x: number; y: number; width: number; height: number },
  viewport: { x: number; y: number; zoom: number },
  canvasSize: { width: number; height: number }
): boolean {
  const viewLeft = -viewport.x / viewport.zoom;
  const viewTop = -viewport.y / viewport.zoom;
  const viewRight = viewLeft + canvasSize.width / viewport.zoom;
  const viewBottom = viewTop + canvasSize.height / viewport.zoom;

  const objLeft = objectBounds.x;
  const objTop = objectBounds.y;
  const objRight = objLeft + objectBounds.width;
  const objBottom = objTop + objectBounds.height;

  // Check if object intersects with viewport
  return !(objRight < viewLeft || 
           objLeft > viewRight || 
           objBottom < viewTop || 
           objTop > viewBottom);
}

// Object pooling utility
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T) {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  size(): number {
    return this.pool.length;
  }

  clear() {
    this.pool.length = 0;
  }
}

// Performance optimization hooks
export function usePerformanceOptimization() {
  // Automatically start measuring when component mounts
  React.useEffect(() => {
    let animationFrame: number;
    
    const measureLoop = () => {
      performanceMonitor.measureFrame();
      performanceMonitor.updateMemoryUsage();
      animationFrame = requestAnimationFrame(measureLoop);
    };
    
    measureLoop();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return performanceMonitor;
}

// Stress testing utility
export function createStressTestObjects(count: number): any[] {
  const objects = [];
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const types = ['rectangle', 'circle', 'text', 'line'];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * 2000;
    const y = Math.random() * 2000;
    const width = 50 + Math.random() * 100;
    const height = 50 + Math.random() * 100;
    
    objects.push({
      id: `stress-${i}`,
      type,
      bounds: { x, y, width, height },
      style: {
        fill: colors[Math.floor(Math.random() * colors.length)],
        stroke: '#000000',
        strokeWidth: 1,
        opacity: 0.7 + Math.random() * 0.3
      },
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      layer: i,
      visible: true,
      locked: false,
      isDirty: false,
      ...(type === 'text' && { text: `Object ${i}` })
    });
  }
  
  return objects;
}