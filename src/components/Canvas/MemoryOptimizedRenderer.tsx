import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';
import { performanceMonitor } from '../../utils/performance';

interface MemoryOptimizedRendererProps {
  objects: CanvasObject[];
  viewport: ViewportState;
  selectedIds: string[];
  isPanning?: boolean;
  isDragging?: boolean;
}

/**
 * Memory-optimized Canvas renderer focused on minimal memory footprint:
 * 1. Single canvas (no multi-canvas overhead)
 * 2. Aggressive object pooling
 * 3. Minimal React state copies
 * 4. Efficient closure management
 * 5. Memory leak prevention
 * 
 * Target: <50MB for 500+ objects
 */
export const MemoryOptimizedRenderer = React.memo(function MemoryOptimizedRenderer({
  objects,
  viewport,
  selectedIds,
  isPanning = false,
  isDragging = false
}: MemoryOptimizedRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTime = useRef(0);
  const renderRequestId = useRef<number | null>(null);
  
  // Memory-efficient object pools (reused, never garbage collected)
  const tempBounds = useRef({ x: 0, y: 0, width: 0, height: 0 });
  // Memory optimization pools
  const selectedSet = useRef(new Set<string>());
  
  
  // Efficient selectedIds set (avoid array operations)
  useMemo(() => {
    selectedSet.current.clear();
    selectedIds.forEach(id => selectedSet.current.add(id));
  }, [selectedIds]);
  
  // Memory-efficient viewport culling with object pooling
  const getVisibleObjects = useCallback((rect: DOMRect): CanvasObject[] => {
    const viewBounds = tempBounds.current;
    
    // Reuse bounds object (no allocation)
    viewBounds.x = -viewport.x / viewport.zoom;
    viewBounds.y = -viewport.y / viewport.zoom;
    viewBounds.width = rect.width / viewport.zoom;
    viewBounds.height = rect.height / viewport.zoom;
    
    // Conservative margin to prevent flickering
    const margin = isDragging ? 100 : isPanning ? 50 : 20;
    viewBounds.x -= margin;
    viewBounds.y -= margin;
    viewBounds.width += margin * 2;
    viewBounds.height += margin * 2;
    
    // Filter without creating new arrays
    const visibleObjects: CanvasObject[] = [];
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj.visible) continue;
      
      const objX = obj.bounds.x + obj.transform.x;
      const objY = obj.bounds.y + obj.transform.y;
      
      // Fast AABB test
      if (!(objX + obj.bounds.width < viewBounds.x ||
            objX > viewBounds.x + viewBounds.width ||
            objY + obj.bounds.height < viewBounds.y ||
            objY > viewBounds.y + viewBounds.height)) {
        visibleObjects.push(obj);
      }
    }
    
    return visibleObjects;
  }, [viewport, isDragging, isPanning, objects]);
  
  
  // Memory-efficient object renderer
  const renderObject = useCallback((ctx: CanvasRenderingContext2D, obj: CanvasObject) => {
    ctx.save();
    
    // Apply transforms
    ctx.translate(
      obj.bounds.x + obj.transform.x,
      obj.bounds.y + obj.transform.y
    );
    if (obj.transform.rotation !== 0) ctx.rotate(obj.transform.rotation);
    if (obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1) {
      ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
    }
    
    // Always explicitly set opacity to prevent state issues
    ctx.globalAlpha = obj.style.opacity;
    
    // Simple, memory-efficient rendering
    switch (obj.type) {
      case 'rectangle':
        ctx.beginPath();
        if (obj.style.cornerRadius && obj.style.cornerRadius > 0) {
          const r = Math.min(obj.style.cornerRadius, obj.bounds.width / 2, obj.bounds.height / 2);
          ctx.roundRect(0, 0, obj.bounds.width, obj.bounds.height, r);
        } else {
          ctx.rect(0, 0, obj.bounds.width, obj.bounds.height);
        }
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill; // Always set fill color explicitly
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke; // Always set stroke color explicitly
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;
        
      case 'circle':
        ctx.beginPath();
        ctx.ellipse(
          obj.bounds.width / 2, obj.bounds.height / 2,
          obj.bounds.width / 2, obj.bounds.height / 2,
          0, 0, 2 * Math.PI
        );
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill; // Always set fill color explicitly
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke; // Always set stroke color explicitly
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;
        
      case 'text':
        if (obj.text) {
          const fontSize = obj.style.fontSize || 16;
          const fontFamily = obj.style.fontFamily || 'Arial';
          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.textAlign = (obj.style.textAlign || 'left') as CanvasTextAlign;
          ctx.textBaseline = 'top';
          
          if (obj.style.fill !== 'transparent') {
            ctx.fillStyle = obj.style.fill; // Always set text color explicitly
            ctx.fillText(obj.text, 0, 0);
          }
        }
        break;
        
      case 'line':
        if (obj.points && obj.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x, obj.points[i].y);
          }
          if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
            ctx.strokeStyle = obj.style.stroke; // Always set stroke color explicitly
            ctx.lineWidth = obj.style.strokeWidth;
            ctx.stroke();
          }
        }
        break;
    }
    
    ctx.restore();
  }, []);
  
  // Memory-efficient main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    
    // Frame limiting for performance
    const now = performance.now();
    const targetFrameTime = isDragging ? 8 : isPanning ? 12 : 16;
    
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
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Setup viewport transform
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);
    
    // Get visible objects (memory-efficient)
    const visibleObjects = getVisibleObjects(rect);
    
    // Sort by layer (in-place, no memory allocation)
    visibleObjects.sort((a, b) => a.layer - b.layer);
    
    // Render all objects
    for (let i = 0; i < visibleObjects.length; i++) {
      renderObject(ctx, visibleObjects[i]);
    }
    
    // Render selection outlines efficiently
    if (selectedSet.current.size > 0) {
      ctx.strokeStyle = '#007bff'; // Always set selection color explicitly
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
  }, [isDragging, isPanning, viewport, getVisibleObjects, renderObject]);
  
  // Canvas setup with memory optimization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Use conservative DPR to reduce memory usage
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for memory efficiency
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        // Use memory-efficient rendering settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium'; // Lower quality for memory efficiency
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
  
  // Immediate render during interactions for responsiveness
  useEffect(() => {
    if (isDragging || isPanning) {
      render();
    } else {
      const timeoutId = setTimeout(render, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [render, isDragging, isPanning]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ zIndex: 2, pointerEvents: 'none' }}
    />
  );
});