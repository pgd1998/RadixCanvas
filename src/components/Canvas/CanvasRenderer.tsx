import React, { useRef, useEffect, useCallback } from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';

interface CanvasRendererProps {
  objects: CanvasObject[];
  viewport: ViewportState;
  selectedIds: string[];
  onObjectClick?: (objectId: string, event: React.MouseEvent) => void;
}

export function CanvasRenderer({ 
  objects, 
  viewport, 
  selectedIds, 
  onObjectClick 
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual canvas size
    const rect = canvas.getBoundingClientRect();
    
    // Clear canvas with proper dimensions
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Set up transformation matrix
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x / viewport.zoom, viewport.y / viewport.zoom);

    // Filter visible objects for performance
    const visibleObjects = objects.filter(obj => {
      if (!obj.visible) return false;
      
      // Basic viewport culling - simplified for debugging
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      const screenBounds = {
        left: -viewport.x / viewport.zoom,
        top: -viewport.y / viewport.zoom,
        right: (-viewport.x + canvasWidth) / viewport.zoom,
        bottom: (-viewport.y + canvasHeight) / viewport.zoom
      };

      // For debugging, let's render all objects initially
      return true; // Change this back to proper culling later
      
      return !(
        obj.bounds.x + obj.bounds.width < screenBounds.left ||
        obj.bounds.x > screenBounds.right ||
        obj.bounds.y + obj.bounds.height < screenBounds.top ||
        obj.bounds.y > screenBounds.bottom
      );
    });

    // Sort by layer for proper z-index
    visibleObjects.sort((a, b) => a.layer - b.layer);

    // Render each object
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

      // Render based on type
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
  }, [objects, viewport, selectedIds]);

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
    };
  }, [render]);

  // Render when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(render, 0);
    return () => clearTimeout(timeoutId);
  }, [render]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onObjectClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (event.clientY - rect.top - viewport.y) / viewport.zoom;

    console.log('Click at:', { x, y, viewport }); // Debug log

    // Find clicked object (top-most first)
    const sortedObjects = [...objects]
      .filter(obj => obj.visible && !obj.locked)
      .sort((a, b) => b.layer - a.layer);

    for (const obj of sortedObjects) {
      const inBounds = 
        x >= obj.bounds.x &&
        x <= obj.bounds.x + obj.bounds.width &&
        y >= obj.bounds.y &&
        y <= obj.bounds.y + obj.bounds.height;

      console.log('Checking object:', obj.id, { inBounds, objBounds: obj.bounds }); // Debug log

      if (inBounds) {
        onObjectClick(obj.id, event);
        return;
      }
    }

    // No object clicked, clear selection
    onObjectClick('', event);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-crosshair"
      style={{ zIndex: 2 }}
      onClick={handleCanvasClick}
    />
  );
}