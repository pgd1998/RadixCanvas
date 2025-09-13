import { useState, useCallback, useRef } from 'react';
import type { ViewportState } from '../types/canvas';
import type { Rectangle } from '../types/base';

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
  bounds: { x: 0, y: 0, width: 10000, height: 10000 }
};

export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const animationRef = useRef<number | undefined>(undefined);

  const updateViewport = useCallback((updates: Partial<ViewportState>) => {
    setViewport(prev => ({ ...prev, ...updates }));
  }, []);

  const panTo = useCallback((x: number, y: number, animate = false) => {
    if (animate) {
      // Smooth animation for pan
      const start = { x: viewport.x, y: viewport.y };
      const duration = 300;
      const startTime = performance.now();

      const animatePan = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentX = start.x + (x - start.x) * easeProgress;
        const currentY = start.y + (y - start.y) * easeProgress;
        
        updateViewport({ x: currentX, y: currentY });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animatePan);
        }
      };
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animatePan);
    } else {
      updateViewport({ x, y });
    }
  }, [viewport.x, viewport.y, updateViewport]);

  const zoomTo = useCallback((zoom: number, centerX?: number, centerY?: number, animate = false) => {
    const clampedZoom = Math.max(0.1, Math.min(5, zoom));
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom to specific point
      const scaleFactor = clampedZoom / viewport.zoom;
      const newX = centerX - (centerX - viewport.x) * scaleFactor;
      const newY = centerY - (centerY - viewport.y) * scaleFactor;
      
      if (animate) {
        // Smooth animation for zoom
        const start = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
        const target = { x: newX, y: newY, zoom: clampedZoom };
        const duration = 200;
        const startTime = performance.now();

        const animateZoom = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          const currentX = start.x + (target.x - start.x) * easeProgress;
          const currentY = start.y + (target.y - start.y) * easeProgress;
          const currentZoom = start.zoom + (target.zoom - start.zoom) * easeProgress;
          
          updateViewport({ x: currentX, y: currentY, zoom: currentZoom });
          
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animateZoom);
          }
        };
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animateZoom);
      } else {
        updateViewport({ x: newX, y: newY, zoom: clampedZoom });
      }
    } else {
      updateViewport({ zoom: clampedZoom });
    }
  }, [viewport.x, viewport.y, viewport.zoom, updateViewport]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.zoom,
      y: (screenY - viewport.y) / viewport.zoom
    };
  }, [viewport.x, viewport.y, viewport.zoom]);

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX * viewport.zoom + viewport.x,
      y: worldY * viewport.zoom + viewport.y
    };
  }, [viewport.x, viewport.y, viewport.zoom]);

  const isVisible = useCallback((bounds: Rectangle) => {
    const screenBounds = {
      left: -viewport.x / viewport.zoom,
      top: -viewport.y / viewport.zoom,
      right: (-viewport.x + window.innerWidth) / viewport.zoom,
      bottom: (-viewport.y + window.innerHeight) / viewport.zoom
    };

    return !(
      bounds.x + bounds.width < screenBounds.left ||
      bounds.x > screenBounds.right ||
      bounds.y + bounds.height < screenBounds.top ||
      bounds.y > screenBounds.bottom
    );
  }, [viewport.x, viewport.y, viewport.zoom]);

  return {
    viewport,
    updateViewport,
    panTo,
    zoomTo,
    screenToWorld,
    worldToScreen,
    isVisible
  };
}