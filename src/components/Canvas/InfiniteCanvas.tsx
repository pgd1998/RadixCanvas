import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { GridLayer } from './GridLayer';
import { CanvasRenderer } from './CanvasRenderer';
import type { CanvasObject } from '../../types/objects';
import type { ToolType } from '../../types/tools';

interface InfiniteCanvasProps {
  objects: CanvasObject[];
  selectedIds: string[];
  activeTool?: ToolType;
  showGrid?: boolean;
  onObjectClick?: (objectId: string, event: React.MouseEvent) => void;
  onObjectCreate?: (object: CanvasObject) => void;
  onCanvasAction?: (action: string, data: any) => void;
}

export function InfiniteCanvas({
  objects,
  selectedIds,
  activeTool = 'select',
  showGrid = true,
  onObjectClick,
  onObjectCreate,
  onCanvasAction
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, panTo, zoomTo, screenToWorld } = useViewport();
  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPoint, setDrawStartPoint] = useState({ x: 0, y: 0 });
  const [drawCurrentPoint, setDrawCurrentPoint] = useState({ x: 0, y: 0 });
  const [previewObject, setPreviewObject] = useState<CanvasObject | null>(null);

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

  // Handle mouse down for panning and drawing
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Middle mouse button or space + left mouse button for panning
    if (event.button === 1 || (event.button === 0 && isSpacePressed)) {
      event.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    // Left mouse button for drawing (when drawing tools are active)
    if (event.button === 0 && activeTool !== 'select' && !isPanning) {
      event.preventDefault();
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      setIsDrawing(true);
      setDrawStartPoint(worldPos);
      setDrawCurrentPoint(worldPos);
    }
  }, [isSpacePressed, activeTool, isPanning, screenToWorld]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Handle panning
    if (isPanning) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      panTo(viewport.x + deltaX, viewport.y + deltaY, false);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    // Handle drawing
    if (isDrawing && activeTool !== 'select') {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      setDrawCurrentPoint(worldPos);
      
      // Update preview object
      const bounds = {
        x: Math.min(drawStartPoint.x, worldPos.x),
        y: Math.min(drawStartPoint.y, worldPos.y),
        width: Math.abs(worldPos.x - drawStartPoint.x),
        height: Math.abs(worldPos.y - drawStartPoint.y)
      };

      if (bounds.width > 1 && bounds.height > 1) {
        const preview: CanvasObject = {
          id: 'preview',
          type: activeTool as any,
          bounds,
          style: {
            fill: activeTool === 'rectangle' ? '#3b82f6' : activeTool === 'circle' ? '#ef4444' : '#059669',
            stroke: '#1e40af',
            strokeWidth: 2,
            opacity: 0.5,
            ...(activeTool === 'text' && { fontSize: 16, fontFamily: 'Arial', textAlign: 'left' as const })
          },
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          layer: 999,
          visible: true,
          locked: false,
          isDirty: false,
          ...(activeTool === 'text' && { text: 'New Text' })
        };
        setPreviewObject(preview);
      }
    }
  }, [isPanning, lastPanPoint, viewport.x, viewport.y, panTo, isDrawing, activeTool, screenToWorld, drawStartPoint]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    
    // Complete drawing
    if (isDrawing && previewObject && onObjectCreate) {
      // Create final object with unique ID
      const finalObject: CanvasObject = {
        ...previewObject,
        id: `obj-${Date.now()}`,
        style: {
          ...previewObject.style,
          opacity: 1 // Make final object fully opaque
        },
        layer: objects.length
      };
      
      // Only create if object has reasonable size
      if (finalObject.bounds.width > 5 && finalObject.bounds.height > 5) {
        onObjectCreate(finalObject);
      }
    }
    
    // Reset drawing state
    setIsDrawing(false);
    setPreviewObject(null);
  }, [isDrawing, previewObject, onObjectCreate, objects.length]);

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

  const getCursor = () => {
    if (isPanning || isSpacePressed) return 'grabbing';
    if (isDrawing) return 'crosshair';
    
    switch (activeTool) {
      case 'rectangle':
      case 'circle':
      case 'text':
        return 'crosshair';
      case 'select':
      default:
        return 'default';
    }
  };
  
  const cursor = getCursor();

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
        objects={previewObject ? [...objects, previewObject] : objects}
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