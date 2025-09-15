import React, { useRef, useEffect, useCallback } from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';
import { performanceMonitor, isObjectInViewport } from '../../utils/performance';

interface CanvasRendererProps {
  objects: CanvasObject[];
  viewport: ViewportState;
  selectedIds: string[];
  isPanning?: boolean;
  isDragging?: boolean;
}

export const CanvasRenderer = React.memo(function CanvasRenderer({ 
  objects, 
  viewport, 
  selectedIds,
  isPanning = false,
  isDragging = false
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTime = useRef(0);
  const renderRequestId = useRef<number | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // FIXED: Disable frame limiting during dragging to prevent flickering
    const now = performance.now();
    const visibleCount = objects.filter(obj => obj.visible).length;
    
    // More conservative frame limiting - prioritize smoothness over performance during interactions
    let targetFrameTime;
    if (isDragging) {
      // During dragging: render as fast as possible to prevent flickering
      targetFrameTime = 8; // ~120fps for smooth dragging
    } else if (isPanning) {
      // During panning: moderate throttling
      targetFrameTime = 16; // 60fps
    } else {
      // When static: can afford some throttling
      targetFrameTime = visibleCount > 300 ? 25 : visibleCount > 150 ? 20 : 16;
    }
    
    if (!isDragging && now - lastRenderTime.current < targetFrameTime) {
      // Only throttle when not dragging
      if (renderRequestId.current) {
        cancelAnimationFrame(renderRequestId.current);
      }
      renderRequestId.current = requestAnimationFrame(render);
      return;
    }
    
    lastRenderTime.current = now;

    // Start performance measurement
    const endRenderMeasurement = performanceMonitor.startRenderMeasurement();

    // Get actual canvas size
    const rect = canvas.getBoundingClientRect();
    
    // Clear canvas with proper dimensions
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Set up transformation matrix
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);

    // FIXED: Disable aggressive culling during dragging to prevent flickering
    const visibleObjects = objects.filter(obj => {
      if (!obj.visible) return false;
      
      // During dragging: render more objects to prevent flickering
      if (isDragging) {
        // Use much larger margins during dragging
        const objX = obj.bounds.x + obj.transform.x;
        const objY = obj.bounds.y + obj.transform.y;
        
        const marginX = (rect.width / viewport.zoom) * 2.0; // Extra large margins
        const marginY = (rect.height / viewport.zoom) * 2.0;
        
        const viewLeft = (-viewport.x / viewport.zoom) - marginX;
        const viewTop = (-viewport.y / viewport.zoom) - marginY;
        const viewRight = viewLeft + (rect.width / viewport.zoom) + (marginX * 2);
        const viewBottom = viewTop + (rect.height / viewport.zoom) + (marginY * 2);
        
        // Very lenient bounds checking during dragging
        return !(
          objX + obj.bounds.width + 100 < viewLeft ||
          objX - 100 > viewRight ||
          objY + obj.bounds.height + 100 < viewTop ||
          objY - 100 > viewBottom
        );
      }
      
      // Normal culling when not dragging
      const objX = obj.bounds.x + obj.transform.x;
      const objY = obj.bounds.y + obj.transform.y;
      
      let marginMultiplier = isPanning ? 0.8 : 0.3;
      
      const marginX = (rect.width / viewport.zoom) * marginMultiplier;
      const marginY = (rect.height / viewport.zoom) * marginMultiplier;
      
      const viewLeft = (-viewport.x / viewport.zoom) - marginX;
      const viewTop = (-viewport.y / viewport.zoom) - marginY;
      const viewRight = viewLeft + (rect.width / viewport.zoom) + (marginX * 2);
      const viewBottom = viewTop + (rect.height / viewport.zoom) + (marginY * 2);
      
      return !(
        objX + obj.bounds.width < viewLeft ||
        objX > viewRight ||
        objY + obj.bounds.height < viewTop ||
        objY > viewBottom
      );
    });

    // Sort by layer for proper z-index
    visibleObjects.sort((a, b) => a.layer - b.layer);

    // Render each object with level-of-detail optimization
    visibleObjects.forEach(obj => {
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
      
      // FIXED: Disable LOD during dragging to maintain visual consistency
      const screenSize = Math.max(obj.bounds.width * viewport.zoom, obj.bounds.height * viewport.zoom);
      const isVerySmall = !isDragging && screenSize < 3; // Only use LOD when not dragging

      // Render based on type with LOD optimization
      if (isVerySmall) {
        // Simplified rendering for very small objects - but not during dragging
        ctx.fillStyle = obj.style.fill !== 'transparent' ? obj.style.fill : obj.style.stroke;
        ctx.fillRect(0, 0, obj.bounds.width, obj.bounds.height);
      } else {
        // Full detailed rendering
        switch (obj.type) {
          case 'rectangle':
          ctx.beginPath();
          if (obj.style.cornerRadius && obj.style.cornerRadius > 0) {
            // Rounded rectangle
            const radius = Math.min(
              obj.style.cornerRadius,
              obj.bounds.width / 2,
              obj.bounds.height / 2
            );
            const x = 0;
            const y = 0;
            const w = obj.bounds.width;
            const h = obj.bounds.height;
            
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + w - radius, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            ctx.lineTo(x + w, y + h - radius);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
          } else {
            ctx.rect(0, 0, obj.bounds.width, obj.bounds.height);
          }
          
          // Fill and stroke
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
            if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
              ctx.strokeStyle = obj.style.stroke;
              ctx.lineWidth = obj.style.strokeWidth;
              ctx.strokeText(obj.text, 0, 0);
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
      }

      // Highlight selected objects
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
    });

    ctx.restore();

    // End performance measurement
    endRenderMeasurement();
  }, [objects, viewport, selectedIds, isPanning, isDragging]);

  // Auto-resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // Set actual size in memory (scaled for high-DPI devices)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Set display size (CSS pixels)
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Scale the drawing context so everything draws at the correct size
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Also trigger on any viewport change
    const observer = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
      if (renderRequestId.current) {
        cancelAnimationFrame(renderRequestId.current);
      }
    };
  }, [render]);

  // FIXED: Render immediately when dependencies change during dragging
  useEffect(() => {
    if (isDragging) {
      // Render immediately during dragging
      render();
    } else {
      // Use timeout for non-dragging scenarios
      const timeoutId = setTimeout(render, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [render, isDragging]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ zIndex: 2, pointerEvents: 'none' }}
    />
  );
});