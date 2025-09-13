import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { GridLayer } from './GridLayer';
import { CanvasRenderer } from './CanvasRenderer';
import type { CanvasObject } from '../../types/objects';

interface InfiniteCanvasProps {
  objects: CanvasObject[];
  selectedIds: string[];
  showGrid?: boolean;
  onObjectClick?: (objectId: string, event: React.MouseEvent) => void;
  onCanvasAction?: (action: string, data: any) => void;
}

export function InfiniteCanvas({
  objects,
  selectedIds,
  showGrid = true,
  onObjectClick,
  onCanvasAction
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, panTo, zoomTo, screenToWorld } = useViewport();
  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomDelta = event.deltaY * -0.001;
    const newZoom = viewport.zoom * (1 + zoomDelta);
    
    zoomTo(newZoom, mouseX, mouseY, false);
  }, [viewport.zoom, zoomTo]);

  // Handle mouse pan
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Middle mouse button or space + left mouse button for panning
    if (event.button === 1 || (event.button === 0 && isSpacePressed)) {
      event.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
  }, [isSpacePressed]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning) return;

    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;
    
    panTo(viewport.x + deltaX, viewport.y + deltaY, false);
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, [isPanning, lastPanPoint, viewport.x, viewport.y, panTo]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(true);
      }

      // Zoom shortcuts
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '0') {
          event.preventDefault();
          zoomTo(1, window.innerWidth / 2, window.innerHeight / 2, true);
        } else if (event.key === '=') {
          event.preventDefault();
          zoomTo(viewport.zoom * 1.2, window.innerWidth / 2, window.innerHeight / 2, true);
        } else if (event.key === '-') {
          event.preventDefault();
          zoomTo(viewport.zoom / 1.2, window.innerWidth / 2, window.innerHeight / 2, true);
        }
      }

      // Arrow key panning
      if (!event.ctrlKey && !event.metaKey) {
        const panStep = 50;
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            panTo(viewport.x, viewport.y + panStep, true);
            break;
          case 'ArrowDown':
            event.preventDefault();
            panTo(viewport.x, viewport.y - panStep, true);
            break;
          case 'ArrowLeft':
            event.preventDefault();
            panTo(viewport.x + panStep, viewport.y, true);
            break;
          case 'ArrowRight':
            event.preventDefault();
            panTo(viewport.x - panStep, viewport.y, true);
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewport.x, viewport.y, viewport.zoom, panTo, zoomTo]);

  // Mouse wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Prevent context menu on right click
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  const cursor = isPanning || isSpacePressed ? 'grabbing' : 'default';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-50"
      style={{ cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Grid Layer */}
      <GridLayer viewport={viewport} showGrid={showGrid} />
      
      {/* Canvas Renderer */}
      <CanvasRenderer
        objects={objects}
        viewport={viewport}
        selectedIds={selectedIds}
        onObjectClick={onObjectClick}
      />
      
      {/* Canvas Info Overlay - FIXED POSITIONING */}
      <div className="absolute top-4 right-4 bg-black/80 text-white rounded px-3 py-1 text-xs font-mono z-10 pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Instructions Overlay - MOVED TO TOP CENTER */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white rounded px-3 py-1 text-xs z-10 pointer-events-none">
        Wheel: Zoom • Middle/Space+drag: Pan • Ctrl+0: Reset
      </div>
    </div>
  );
}