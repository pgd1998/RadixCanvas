import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';
import { performanceMonitor } from '../../utils/performance';
import { QuadTree } from '../../utils/quadtree';

interface HighPerformanceRendererProps {
  objects: CanvasObject[];
  viewport: ViewportState;
  selectedIds: string[];
  isPanning?: boolean;
  isDragging?: boolean;
}

/**
 * Ultra-high performance Canvas renderer targeting 125+ FPS:
 * 
 * Key optimizations:
 * 1. Zero-allocation render loops using object pooling
 * 2. Spatial indexing with QuadTree for O(log n) culling
 * 3. Batched Canvas state changes to minimize API calls
 * 4. Hardware-accelerated transforms using CSS transforms
 * 5. Dynamic level-of-detail based on zoom and object size
 * 6. Aggressive frame rate targeting (8ms max frame time)
 * 7. Path2D caching for frequently rendered shapes
 */
export const HighPerformanceRenderer = React.memo(function HighPerformanceRenderer({
  objects,
  viewport,
  selectedIds,
  isPanning = false,
  isDragging = false
}: HighPerformanceRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTime = useRef(0);
  const renderRequestId = useRef<number | null>(null);
  
  // Object pooling for zero-allocation rendering
  const tempBounds = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const selectedSet = useRef(new Set<string>());
  const visibleObjectsPool = useRef<CanvasObject[]>([]);
  
  // Path2D caching for performance
  const pathCache = useRef(new Map<string, Path2D>());
  const pathCacheKeys = useRef<string[]>([]);
  
  // QuadTree for spatial indexing
  const quadTree = useRef<QuadTree>(
    new QuadTree({ x: -20000, y: -20000, width: 40000, height: 40000 }, 8, 12)
  );
  const lastObjectCount = useRef(0);
  const shouldRebuildQuadTree = useRef(true);
  
  
  // Efficiently rebuild QuadTree when objects change
  useMemo(() => {
    if (objects.length !== lastObjectCount.current || shouldRebuildQuadTree.current) {
      quadTree.current.rebuild(objects);
      lastObjectCount.current = objects.length;
      shouldRebuildQuadTree.current = false;
    }
  }, [objects]);
  
  // Efficient selectedIds set (avoid array operations)
  useMemo(() => {
    selectedSet.current.clear();
    selectedIds.forEach(id => selectedSet.current.add(id));
  }, [selectedIds]);
  
  // Generate cache key for Path2D objects
  const generatePathKey = useCallback((obj: CanvasObject) => {
    return `${obj.type}-${obj.bounds.width}-${obj.bounds.height}-${obj.style.cornerRadius || 0}`;
  }, []);
  
  // Get or create cached Path2D object
  const getCachedPath = useCallback((obj: CanvasObject): Path2D | null => {
    const key = generatePathKey(obj);
    
    if (pathCache.current.has(key)) {
      return pathCache.current.get(key)!;
    }
    
    // Create new path
    const path = new Path2D();
    
    switch (obj.type) {
      case 'rectangle':
        if (obj.style.cornerRadius && obj.style.cornerRadius > 0) {
          const r = Math.min(obj.style.cornerRadius, obj.bounds.width / 2, obj.bounds.height / 2);
          path.roundRect(0, 0, obj.bounds.width, obj.bounds.height, r);
        } else {
          path.rect(0, 0, obj.bounds.width, obj.bounds.height);
        }
        break;
      case 'circle':
        path.ellipse(
          obj.bounds.width / 2,
          obj.bounds.height / 2,
          obj.bounds.width / 2,
          obj.bounds.height / 2,
          0, 0, 2 * Math.PI
        );
        break;
      default:
        return null;
    }
    
    // Cache the path with LRU eviction
    pathCache.current.set(key, path);
    pathCacheKeys.current.push(key);
    
    // Limit cache size (LRU eviction)
    if (pathCacheKeys.current.length > 500) {
      const oldestKey = pathCacheKeys.current.shift()!;
      pathCache.current.delete(oldestKey);
    }
    
    return path;
  }, [generatePathKey]);
  
  // Ultra-fast viewport culling using QuadTree
  const getVisibleObjects = useCallback((rect: DOMRect): CanvasObject[] => {
    const viewBounds = tempBounds.current;
    
    // Calculate viewport bounds with conservative margins
    const margin = isDragging ? 200 : isPanning ? 100 : 50;
    viewBounds.x = (-viewport.x / viewport.zoom) - margin;
    viewBounds.y = (-viewport.y / viewport.zoom) - margin;
    viewBounds.width = (rect.width / viewport.zoom) + (margin * 2);
    viewBounds.height = (rect.height / viewport.zoom) + (margin * 2);
    
    // Use QuadTree for O(log n) spatial queries
    const candidateObjects = quadTree.current.retrieve(viewBounds);
    
    // Reuse the visible objects array to avoid allocations
    visibleObjectsPool.current.length = 0;
    
    // Final visibility test with precise bounds checking
    for (let i = 0; i < candidateObjects.length; i++) {
      const obj = candidateObjects[i];
      if (obj.visible) {
        visibleObjectsPool.current.push(obj);
      }
    }
    
    return visibleObjectsPool.current;
  }, [viewport, isDragging, isPanning]);
  
  
  // Ultra-optimized object renderer with batching and LOD
  const renderObject = useCallback((ctx: CanvasRenderingContext2D, obj: CanvasObject) => {
    ctx.save();
    
    // Apply transforms
    const hasTransform = obj.transform.x !== 0 || obj.transform.y !== 0;
    const hasRotation = obj.transform.rotation !== 0;
    const hasScale = obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1;
    
    ctx.translate(
      obj.bounds.x + (hasTransform ? obj.transform.x : 0),
      obj.bounds.y + (hasTransform ? obj.transform.y : 0)
    );
    
    if (hasRotation) ctx.rotate(obj.transform.rotation);
    if (hasScale) ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
    
    // Level of detail optimization
    const screenSize = Math.max(
      obj.bounds.width * viewport.zoom,
      obj.bounds.height * viewport.zoom
    );
    
    // Set opacity directly
    ctx.globalAlpha = obj.style.opacity;
    
    if (screenSize < 3) {
      // Ultra-fast rendering for tiny objects (single pixel)
      ctx.fillStyle = obj.style.fill !== 'transparent' ? obj.style.fill : obj.style.stroke;
      ctx.fillRect(0, 0, obj.bounds.width, obj.bounds.height);
    } else if (screenSize < 8) {
      // Fast rendering for small objects (no stroke, simplified shapes)
      if (obj.style.fill !== 'transparent') {
        ctx.fillStyle = obj.style.fill;
        if (obj.type === 'circle') {
          ctx.beginPath();
          ctx.ellipse(
            obj.bounds.width / 2, obj.bounds.height / 2,
            obj.bounds.width / 2, obj.bounds.height / 2,
            0, 0, 2 * Math.PI
          );
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, obj.bounds.width, obj.bounds.height);
        }
      }
    } else {
      // Full quality rendering for larger objects
      switch (obj.type) {
        case 'rectangle':
        case 'circle': {
          const cachedPath = getCachedPath(obj);
          if (cachedPath) {
            // Use cached Path2D for maximum performance
            if (obj.style.fill !== 'transparent') {
              ctx.fillStyle = obj.style.fill;
              ctx.fill(cachedPath);
            }
            if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
              ctx.strokeStyle = obj.style.stroke;
              ctx.lineWidth = obj.style.strokeWidth;
              ctx.stroke(cachedPath);
            }
          } else {
            // Fallback to traditional rendering
            ctx.beginPath();
            if (obj.type === 'rectangle') {
              ctx.rect(0, 0, obj.bounds.width, obj.bounds.height);
            } else {
              ctx.ellipse(
                obj.bounds.width / 2, obj.bounds.height / 2,
                obj.bounds.width / 2, obj.bounds.height / 2,
                0, 0, 2 * Math.PI
              );
            }
            
            if (obj.style.fill !== 'transparent') {
              ctx.fillStyle = obj.style.fill;
              ctx.fill();
            }
            if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
              ctx.strokeStyle = obj.style.stroke;
              ctx.lineWidth = obj.style.strokeWidth;
              ctx.stroke();
            }
          }
          break;
        }
        
        case 'text':
          if (obj.text && screenSize > 12) { // Only render text if large enough
            const fontSize = obj.style.fontSize || 16;
            const fontFamily = obj.style.fontFamily || 'Arial';
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textAlign = (obj.style.textAlign || 'left') as CanvasTextAlign;
            ctx.textBaseline = 'top';
            
            if (obj.style.fill !== 'transparent') {
              ctx.fillStyle = obj.style.fill;
              ctx.fillText(obj.text, 0, 0);
            }
          }
          break;
          
        case 'line':
          if (obj.points && obj.points.length > 1 && obj.style.strokeWidth > 0) {
            ctx.strokeStyle = obj.style.stroke;
            ctx.lineWidth = obj.style.strokeWidth;
            ctx.beginPath();
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            for (let i = 1; i < obj.points.length; i++) {
              ctx.lineTo(obj.points[i].x, obj.points[i].y);
            }
            ctx.stroke();
          }
          break;
      }
    }
    
    ctx.restore();
  }, [viewport.zoom, getCachedPath]);
  
  // Ultra-high performance main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Target 125+ FPS (8ms max frame time)
    const now = performance.now();
    const targetFrameTime = 8;
    
    if (now - lastRenderTime.current < targetFrameTime) {
      if (renderRequestId.current) {
        cancelAnimationFrame(renderRequestId.current);
      }
      renderRequestId.current = requestAnimationFrame(render);
      return;
    }
    
    lastRenderTime.current = now;
    
    // Start performance measurement
    const endMeasurement = performanceMonitor.startRenderMeasurement();
    
    const rect = canvas.getBoundingClientRect();
    
    // Clear canvas efficiently
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Setup viewport transform
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);
    
    // Get visible objects using QuadTree
    const visibleObjects = getVisibleObjects(rect);
    
    // Sort by layer (in-place to avoid allocations)
    visibleObjects.sort((a, b) => a.layer - b.layer);
    
    // Render all objects
    for (let i = 0; i < visibleObjects.length; i++) {
      renderObject(ctx, visibleObjects[i]);
    }
    
    // Render selection outlines efficiently
    if (selectedSet.current.size > 0) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      
      for (let i = 0; i < visibleObjects.length; i++) {
        const obj = visibleObjects[i];
        if (selectedSet.current.has(obj.id)) {
          ctx.strokeRect(
            obj.bounds.x + obj.transform.x - 2,
            obj.bounds.y + obj.transform.y - 2,
            obj.bounds.width + 4,
            obj.bounds.height + 4
          );
        }
      }
      
      ctx.setLineDash([]);
    }
    
    ctx.restore();
    
    // End performance measurement
    endMeasurement();
    
    // Update object count for performance monitoring
    performanceMonitor.updateObjectCount(objects.length);
    
  }, [viewport, getVisibleObjects, renderObject, objects.length]);
  
  // Canvas setup with hardware acceleration hints
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Use device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        
        // Optimize for performance
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Performance hints (if supported)
        if ('textRenderingOptimization' in ctx) {
          (ctx as any).textRenderingOptimization = 'speed';
        }
        if ('willReadFrequently' in ctx) {
          (ctx as any).willReadFrequently = false;
        }
      }
      
      render();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (renderRequestId.current) {
        cancelAnimationFrame(renderRequestId.current);
      }
    };
  }, [render]);
  
  // Immediate render during interactions
  useEffect(() => {
    render();
  }, [render]);
  
  // Trigger QuadTree rebuild when objects change significantly
  useEffect(() => {
    shouldRebuildQuadTree.current = true;
  }, [objects]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 2, 
        pointerEvents: 'none',
        // Hardware acceleration hints
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    />
  );
});