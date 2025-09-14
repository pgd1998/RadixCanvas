import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';
import { performanceMonitor, isObjectInViewport } from '../../utils/performance';

interface OptimizedCanvasProps {
  objects: CanvasObject[];
  viewport: ViewportState;
  selectedIds: string[];
  isDragging?: boolean;
  draggedObjects?: CanvasObject[];
}

export const OptimizedCanvas = React.memo(function OptimizedCanvas({ 
  objects, 
  viewport, 
  selectedIds,
  isDragging = false,
  draggedObjects = []
}: OptimizedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTime = useRef(0);

  // Separate objects into static and dynamic for layered rendering
  const { staticObjects, dynamicObjects } = useMemo(() => {
    if (!isDragging) {
      return { staticObjects: objects, dynamicObjects: [] };
    }
    
    const draggedIds = new Set(draggedObjects.map(obj => obj.id));
    const static: CanvasObject[] = [];
    const dynamic: CanvasObject[] = [];
    
    objects.forEach(obj => {
      if (draggedIds.has(obj.id)) {
        dynamic.push(obj);
      } else {
        static.push(obj);
      }
    });
    
    return { staticObjects: static, dynamicObjects: dynamic };
  }, [objects, isDragging, draggedObjects]);

  // Render static objects (only when they change)
  const renderStaticObjects = useCallback((ctx: CanvasRenderingContext2D, bounds: DOMRect) => {
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    
    // Set up transformation matrix
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);

    // Filter visible objects
    const visibleObjects = staticObjects.filter(obj => {
      if (!obj.visible) return false;
      return isObjectInViewport(
        {
          x: obj.bounds.x + obj.transform.x,
          y: obj.bounds.y + obj.transform.y,
          width: obj.bounds.width,
          height: obj.bounds.height
        },
        viewport,
        { width: bounds.width, height: bounds.height }
      );
    });

    // Sort by layer and render
    visibleObjects.sort((a, b) => a.layer - b.layer);
    visibleObjects.forEach(obj => renderObject(ctx, obj, selectedIds));

    ctx.restore();
  }, [staticObjects, viewport, selectedIds]);

  // Render dynamic objects (updates frequently)
  const renderDynamicObjects = useCallback((ctx: CanvasRenderingContext2D, bounds: DOMRect) => {
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    
    // Set up transformation matrix
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);

    // Render dynamic objects
    dynamicObjects.sort((a, b) => a.layer - b.layer);
    dynamicObjects.forEach(obj => renderObject(ctx, obj, selectedIds));

    ctx.restore();
  }, [dynamicObjects, viewport, selectedIds]);

  // Object rendering function
  const renderObject = (ctx: CanvasRenderingContext2D, obj: CanvasObject, selectedIds: string[]) => {
    ctx.save();
    
    // Apply object transform
    ctx.translate(
      obj.bounds.x + obj.transform.x, 
      obj.bounds.y + obj.transform.y
    );
    ctx.rotate(obj.transform.rotation);
    ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
    
    // Set style
    ctx.globalAlpha = obj.style.opacity;

    // Render based on type
    switch (obj.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(0, 0, obj.bounds.width, obj.bounds.height);
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill;
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke;
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'circle':
        ctx.beginPath();
        const radiusX = obj.bounds.width / 2;
        const radiusY = obj.bounds.height / 2;
        ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill;
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke;
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.style.fontSize || 16}px ${obj.style.fontFamily || 'Arial'}`;
          ctx.textAlign = (obj.style.textAlign || 'left') as CanvasTextAlign;
          ctx.textBaseline = 'top';
          
          if (obj.style.fill !== 'transparent') {
            ctx.fillStyle = obj.style.fill;
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
          if (obj.style.strokeWidth > 0) {
            ctx.strokeStyle = obj.style.stroke;
            ctx.lineWidth = obj.style.strokeWidth;
            ctx.stroke();
          }
        }
        break;
    }

    // Selection highlight
    if (selectedIds.includes(obj.id)) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2 / viewport.zoom;
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
      ctx.beginPath();
      ctx.rect(-2, -2, obj.bounds.width + 4, obj.bounds.height + 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  // Render loop with frame limiting
  const render = useCallback(() => {
    const now = performance.now();
    const targetFrameTime = objects.length > 200 ? 33 : 16; // 30fps for 200+, 60fps otherwise
    
    if (now - lastRenderTime.current < targetFrameTime) {
      return;
    }
    
    const endRenderMeasurement = performanceMonitor.startRenderMeasurement();
    
    const staticCanvas = staticCanvasRef.current;
    const dynamicCanvas = canvasRef.current;
    
    if (!staticCanvas || !dynamicCanvas) return;
    
    const staticCtx = staticCanvas.getContext('2d');
    const dynamicCtx = dynamicCanvas.getContext('2d');
    
    if (!staticCtx || !dynamicCtx) return;

    const rect = staticCanvas.getBoundingClientRect();

    // Render static layer only if not dragging or static objects changed
    if (!isDragging || staticObjects.length > 0) {
      renderStaticObjects(staticCtx, rect);
    }

    // Always render dynamic layer
    renderDynamicObjects(dynamicCtx, rect);

    lastRenderTime.current = now;
    endRenderMeasurement();
  }, [objects.length, staticObjects, renderStaticObjects, renderDynamicObjects, isDragging]);

  // Auto-resize canvases
  useEffect(() => {
    const resizeCanvases = () => {
      const canvases = [staticCanvasRef.current, canvasRef.current];
      
      canvases.forEach(canvas => {
        if (!canvas) return;
        
        const container = canvas.parentElement;
        if (!container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      });
      
      render();
    };

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    return () => {
      window.removeEventListener('resize', resizeCanvases);
    };
  }, [render]);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="absolute inset-0">
      {/* Static layer - objects that don't move */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      />
      {/* Dynamic layer - moving objects and UI */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ zIndex: 2, pointerEvents: 'none' }}
      />
    </div>
  );
});