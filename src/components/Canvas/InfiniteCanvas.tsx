import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { GridLayer } from './GridLayer';
import { CanvasRenderer } from './CanvasRenderer';
import { ResizeHandles } from './ResizeHandles';
import { TextInput } from '../UI/TextInput';
import type { CanvasObject } from '../../types/objects';
import type { ToolType } from '../../types/tools';
import type { ResizeHandle } from '../../types/tools';

interface InfiniteCanvasProps {
  objects: CanvasObject[];
  selectedIds: string[];
  activeTool?: ToolType;
  showGrid?: boolean;
  onObjectClick?: (objectId: string, event: React.MouseEvent) => void;
  onObjectCreate?: (object: CanvasObject) => void;
  onObjectUpdate?: (object: CanvasObject) => void;
  onCanvasAction?: (action: string, data: any) => void;
}

export function InfiniteCanvas({
  objects,
  selectedIds,
  activeTool = 'select',
  showGrid = true,
  onObjectClick,
  onObjectCreate,
  onObjectUpdate,
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
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  
  // Line drawing state
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [linePoints, setLinePoints] = useState<{ x: number; y: number }[]>([]);
  
  // Shape dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState({ x: 0, y: 0 });
  const [draggedObjects, setDraggedObjects] = useState<CanvasObject[]>([]);
  
  // Shape resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartBounds, setResizeStartBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState({ x: 0, y: 0 });

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
      
      if (activeTool === 'line') {
        // Line drawing - start collecting points
        setIsDrawingLine(true);
        setLinePoints([worldPos]);
      } else {
        // Regular shape drawing
        setIsDrawing(true);
        setDrawStartPoint(worldPos);
        setDrawCurrentPoint(worldPos);
      }
    }

    // Left mouse button for dragging (when select tool is active and clicking on selected objects)
    if (event.button === 0 && activeTool === 'select' && !isPanning && selectedIds.length > 0) {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      
      // Check if clicking on any selected object
      const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
      const clickedSelectedObject = selectedObjects.find(obj => 
        worldPos.x >= obj.bounds.x &&
        worldPos.x <= obj.bounds.x + obj.bounds.width &&
        worldPos.y >= obj.bounds.y &&
        worldPos.y <= obj.bounds.y + obj.bounds.height
      );

      if (clickedSelectedObject) {
        event.preventDefault();
        setIsDragging(true);
        setDragStartPoint(worldPos);
        setDraggedObjects(selectedObjects);
      }
    }
  }, [isSpacePressed, activeTool, isPanning, screenToWorld, selectedIds, objects]);

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

    // Handle line drawing
    if (isDrawingLine && activeTool === 'line') {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      setLinePoints(prev => [...prev, worldPos]);
      
      // Create line preview
      if (linePoints.length > 0) {
        const allPoints = [...linePoints, worldPos];
        const minX = Math.min(...allPoints.map(p => p.x));
        const minY = Math.min(...allPoints.map(p => p.y));
        const maxX = Math.max(...allPoints.map(p => p.x));
        const maxY = Math.max(...allPoints.map(p => p.y));
        
        // Convert points to be relative to the bounds origin
        const relativePoints = allPoints.map(p => ({
          x: p.x - minX,
          y: p.y - minY
        }));
        
        const bounds = {
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1)
        };

        const preview: CanvasObject = {
          id: 'preview',
          type: 'line',
          bounds,
          style: {
            fill: 'transparent',
            stroke: '#1e40af',
            strokeWidth: 2,
            opacity: 0.7
          },
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          layer: 999,
          visible: true,
          locked: false,
          isDirty: false,
          points: relativePoints
        };
        setPreviewObject(preview);
      }
    }

    // Handle shape resizing
    if (isResizing && resizeHandle && resizeStartBounds && selectedIds.length === 1) {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      const selectedObject = objects.find(obj => selectedIds.includes(obj.id));
      
      if (selectedObject) {
        const deltaX = worldPos.x - resizeStartPoint.x;
        const deltaY = worldPos.y - resizeStartPoint.y;
        
        let newBounds = { ...resizeStartBounds };
        
        // Calculate new bounds based on resize handle
        switch (resizeHandle) {
          case 'nw':
            newBounds.x = resizeStartBounds.x + deltaX;
            newBounds.y = resizeStartBounds.y + deltaY;
            newBounds.width = resizeStartBounds.width - deltaX;
            newBounds.height = resizeStartBounds.height - deltaY;
            break;
          case 'ne':
            newBounds.y = resizeStartBounds.y + deltaY;
            newBounds.width = resizeStartBounds.width + deltaX;
            newBounds.height = resizeStartBounds.height - deltaY;
            break;
          case 'sw':
            newBounds.x = resizeStartBounds.x + deltaX;
            newBounds.width = resizeStartBounds.width - deltaX;
            newBounds.height = resizeStartBounds.height + deltaY;
            break;
          case 'se':
            newBounds.width = resizeStartBounds.width + deltaX;
            newBounds.height = resizeStartBounds.height + deltaY;
            break;
          case 'n':
            newBounds.y = resizeStartBounds.y + deltaY;
            newBounds.height = resizeStartBounds.height - deltaY;
            break;
          case 's':
            newBounds.height = resizeStartBounds.height + deltaY;
            break;
          case 'w':
            newBounds.x = resizeStartBounds.x + deltaX;
            newBounds.width = resizeStartBounds.width - deltaX;
            break;
          case 'e':
            newBounds.width = resizeStartBounds.width + deltaX;
            break;
        }
        
        // Enforce minimum size
        const minSize = 10;
        if (newBounds.width < minSize) {
          if (resizeHandle.includes('w')) {
            newBounds.x = newBounds.x + newBounds.width - minSize;
          }
          newBounds.width = minSize;
        }
        if (newBounds.height < minSize) {
          if (resizeHandle.includes('n')) {
            newBounds.y = newBounds.y + newBounds.height - minSize;
          }
          newBounds.height = minSize;
        }
        
        const updatedObject = {
          ...selectedObject,
          bounds: newBounds,
          isDirty: true
        };
        
        if (onObjectUpdate) {
          onObjectUpdate(updatedObject);
        }
      }
      return;
    }

    // Handle shape dragging
    if (isDragging && draggedObjects.length > 0) {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      const deltaX = worldPos.x - dragStartPoint.x;
      const deltaY = worldPos.y - dragStartPoint.y;

      // Update dragged objects positions in real-time
      draggedObjects.forEach(obj => {
        const updatedObject = {
          ...obj,
          bounds: {
            ...obj.bounds,
            x: obj.bounds.x + deltaX,
            y: obj.bounds.y + deltaY
          },
          isDirty: true
        };
        if (onObjectUpdate) {
          onObjectUpdate(updatedObject);
        }
      });

      // Update drag start point for next frame
      setDragStartPoint(worldPos);
      return;
    }

    // Handle regular shape drawing
    if (isDrawing && activeTool !== 'select' && activeTool !== 'line') {
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
  }, [isPanning, lastPanPoint, viewport.x, viewport.y, panTo, isDrawing, isDrawingLine, isDragging, draggedObjects, dragStartPoint, isResizing, resizeHandle, resizeStartBounds, resizeStartPoint, selectedIds, objects, activeTool, screenToWorld, drawStartPoint, linePoints, onObjectUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
    setDraggedObjects([]);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStartBounds(null);
    
    // Complete line drawing
    if (isDrawingLine && linePoints.length > 1 && onObjectCreate) {
      const minX = Math.min(...linePoints.map(p => p.x));
      const minY = Math.min(...linePoints.map(p => p.y));
      const maxX = Math.max(...linePoints.map(p => p.x));
      const maxY = Math.max(...linePoints.map(p => p.y));
      
      // Convert points to be relative to the bounds origin
      const relativePoints = linePoints.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }));
      
      const finalLineObject: CanvasObject = {
        id: `obj-${Date.now()}`,
        type: 'line',
        bounds: {
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1)
        },
        style: {
          fill: 'transparent',
          stroke: '#1e40af',
          strokeWidth: 2,
          opacity: 1
        },
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        layer: objects.length,
        visible: true,
        locked: false,
        isDirty: false,
        points: relativePoints
      };
      
      onObjectCreate(finalLineObject);
    }
    
    // Complete regular shape drawing
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
        
        // For text objects, immediately enter edit mode
        if (finalObject.type === 'text') {
          setEditingTextId(finalObject.id);
          setTextInputValue(finalObject.text || '');
        }
      }
    }
    
    // Reset drawing state
    setIsDrawing(false);
    setIsDrawingLine(false);
    setLinePoints([]);
    setPreviewObject(null);
  }, [isDrawing, isDrawingLine, linePoints, previewObject, onObjectCreate, objects.length]);

  // Handle double-click for text editing
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    
    // Find clicked text object
    const clickedTextObject = objects
      .filter(obj => obj.type === 'text' && obj.visible && !obj.locked)
      .sort((a, b) => b.layer - a.layer)
      .find(obj => 
        worldPos.x >= obj.bounds.x &&
        worldPos.x <= obj.bounds.x + obj.bounds.width &&
        worldPos.y >= obj.bounds.y &&
        worldPos.y <= obj.bounds.y + obj.bounds.height
      );

    if (clickedTextObject) {
      setEditingTextId(clickedTextObject.id);
      setTextInputValue(clickedTextObject.text || '');
    }
  }, [objects, screenToWorld]);

  // Handle text editing completion
  const handleTextComplete = useCallback(() => {
    if (editingTextId && onObjectUpdate) {
      const textObject = objects.find(obj => obj.id === editingTextId);
      if (textObject) {
        const updatedObject = {
          ...textObject,
          text: textInputValue,
          isDirty: true
        };
        onObjectUpdate(updatedObject);
      }
    }
    setEditingTextId(null);
    setTextInputValue('');
  }, [editingTextId, textInputValue, objects, onObjectUpdate]);

  // Handle text editing cancellation
  const handleTextCancel = useCallback(() => {
    setEditingTextId(null);
    setTextInputValue('');
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((handle: ResizeHandle, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || selectedIds.length !== 1) return;

    const selectedObject = objects.find(obj => selectedIds.includes(obj.id));
    if (!selectedObject) return;

    const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    
    setIsResizing(true);
    setResizeHandle(handle.type);
    setResizeStartPoint(worldPos);
    setResizeStartBounds(selectedObject.bounds);
  }, [selectedIds, objects, screenToWorld]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle space when editing text
      if (editingTextId) return;
      
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
      // Don't handle space when editing text
      if (editingTextId) return;
      
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
    if (isDrawing || isDrawingLine) return 'crosshair';
    if (isDragging) return 'move';
    if (isResizing) {
      // Return appropriate resize cursor based on handle
      switch (resizeHandle) {
        case 'nw':
        case 'se':
          return 'nw-resize';
        case 'ne':
        case 'sw':
          return 'ne-resize';
        case 'n':
        case 's':
          return 'n-resize';
        case 'e':
        case 'w':
          return 'e-resize';
        default:
          return 'default';
      }
    }
    
    switch (activeTool) {
      case 'rectangle':
      case 'circle':
      case 'text':
      case 'line':
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
      onDoubleClick={handleDoubleClick}
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
      <div className="modern-canvas-info absolute top-4 right-4 z-10 pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Instructions Overlay - MOVED TO TOP CENTER */}
      <div className="modern-canvas-info absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
        Wheel: Zoom • Middle/Space+drag: Pan • Ctrl+0: Reset
      </div>

      {/* Text Input Overlay */}
      {editingTextId && (() => {
        const textObject = objects.find(obj => obj.id === editingTextId);
        return textObject ? (
          <TextInput
            object={textObject}
            value={textInputValue}
            onChange={setTextInputValue}
            onComplete={handleTextComplete}
            onCancel={handleTextCancel}
            viewport={viewport}
          />
        ) : null;
      })()}

      {/* Resize Handles for Selected Objects */}
      {activeTool === 'select' && selectedIds.length === 1 && !editingTextId && (() => {
        const selectedObject = objects.find(obj => selectedIds.includes(obj.id));
        return selectedObject ? (
          <ResizeHandles
            object={selectedObject}
            viewport={viewport}
            onResizeStart={handleResizeStart}
          />
        ) : null;
      })()}
    </div>
  );
}