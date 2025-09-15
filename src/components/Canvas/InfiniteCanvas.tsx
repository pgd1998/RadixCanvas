import { useRef, useCallback, useEffect, useState } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { GridLayer } from './GridLayer';
import { HighPerformanceRenderer } from './HighPerformanceRenderer';
import { ResizeHandles } from './ResizeHandles';
import { TextInput } from '../UI/TextInput';
import type { CanvasObject } from '../../types/objects';
import type { ToolType } from '../../types/tools';
import type { ResizeHandle } from '../../types/tools';
import { getModifierKey } from '../../utils/platform';
import { usePerformanceOptimization } from '../../utils/performance';

interface InfiniteCanvasProps {
  objects: CanvasObject[];
  selectedIds: string[];
  activeTool?: ToolType;
  showGrid?: boolean;
  onObjectClick?: (objectId: string, event: React.MouseEvent) => void;
  onObjectCreate?: (object: CanvasObject) => void;
  onObjectUpdate?: (object: CanvasObject) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
}

export function InfiniteCanvas({
  objects,
  selectedIds,
  activeTool = 'select',
  showGrid = true,
  onObjectClick,
  onObjectCreate,
  onObjectUpdate,
  onViewportChange
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, panTo, zoomTo, screenToWorld } = useViewport();
  
  // Initialize performance monitoring
  usePerformanceOptimization();
  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPoint, setDrawStartPoint] = useState({ x: 0, y: 0 });
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
  const [originalObjectPositions, setOriginalObjectPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  
  // Shape resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartBounds, setResizeStartBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState({ x: 0, y: 0 });

  // Selection box state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

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
    
    // Hide welcome overlay on first interaction
    if (showWelcome) {
      setShowWelcome(false);
    }

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
      }
    }

    // Left mouse button for dragging (when select tool is active)
    if (event.button === 0 && activeTool === 'select' && !isPanning) {
      const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      
      // OPTIMIZATION: Use spatial indexing for large object counts
      let clickedObject: CanvasObject | undefined;
      
      if (objects.length > 100) {
        // For large object counts, check selected objects first (most likely to be clicked)
        const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id) && obj.visible && !obj.locked);
        clickedObject = selectedObjects
          .sort((a, b) => b.layer - a.layer)
          .find(obj => 
            worldPos.x >= obj.bounds.x &&
            worldPos.x <= obj.bounds.x + obj.bounds.width &&
            worldPos.y >= obj.bounds.y &&
            worldPos.y <= obj.bounds.y + obj.bounds.height
          );
        
        // If no selected object clicked, check visible objects in viewport
        if (!clickedObject) {
          const visibleObjects = objects.filter(obj => 
            obj.visible && !obj.locked
          );
          
          clickedObject = visibleObjects
            .sort((a, b) => b.layer - a.layer)
            .find(obj => 
              worldPos.x >= obj.bounds.x &&
              worldPos.x <= obj.bounds.x + obj.bounds.width &&
              worldPos.y >= obj.bounds.y &&
              worldPos.y <= obj.bounds.y + obj.bounds.height
            );
        }
      } else {
        // For smaller object counts, use original method
        const clickableObjects = objects.filter(obj => obj.visible && !obj.locked);
        clickedObject = clickableObjects
          .sort((a, b) => b.layer - a.layer)
          .find(obj => 
            worldPos.x >= obj.bounds.x &&
            worldPos.x <= obj.bounds.x + obj.bounds.width &&
            worldPos.y >= obj.bounds.y &&
            worldPos.y <= obj.bounds.y + obj.bounds.height
          );
      }

      if (clickedObject) {
        event.preventDefault();
        
        // If clicking on unselected object, select it first
        if (!selectedIds.includes(clickedObject.id)) {
          if (onObjectClick) {
            onObjectClick(clickedObject.id, event);
          }
        }
        
        // Prepare for dragging (works for both newly selected and already selected objects)
        const objectsToDrag = selectedIds.includes(clickedObject.id) 
          ? objects.filter(obj => selectedIds.includes(obj.id))
          : [clickedObject];
          
        setIsDragging(true);
        setDragStartPoint(worldPos);
        setDraggedObjects(objectsToDrag);
        
        // Store original positions
        const originalPositions: { [key: string]: { x: number; y: number } } = {};
        objectsToDrag.forEach(obj => {
          originalPositions[obj.id] = { x: obj.bounds.x, y: obj.bounds.y };
        });
        setOriginalObjectPositions(originalPositions);
      } else {
        // Clicked on empty space - start selection box or clear selection
        if (event.ctrlKey || event.metaKey) {
          // Don't clear selection if holding Ctrl/Cmd
        } else {
          // Clear selection
          if (onObjectClick) {
            onObjectClick('', event);
          }
        }
        
        // Start selection box
        setIsSelecting(true);
        setSelectionStart(worldPos);
        setSelectionBox({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 });
      }
    }
  }, [isSpacePressed, activeTool, isPanning, screenToWorld, selectedIds, objects, onObjectClick, showWelcome, setShowWelcome]);
  
  // Hide welcome overlay when user changes tools
  useEffect(() => {
    if (activeTool !== 'select' && showWelcome) {
      setShowWelcome(false);
    }
  }, [activeTool, showWelcome]);

  // Performance-based throttling for large object counts

  // Throttled mouse move for better performance
  const handleMouseMoveThrottled = useCallback((event: React.MouseEvent) => {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return;

  // Handle panning with minimal throttling to prevent flickering
  if (isPanning) {
    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;
    
    // FIXED: Reduced threshold for smoother panning
    if (Math.abs(deltaX) < 0.1 && Math.abs(deltaY) < 0.1) {
      return;
    }
    
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

  // FIXED: Improved shape dragging with immediate updates and no throttling
  if (isDragging && draggedObjects.length > 0) {
    const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    const deltaX = worldPos.x - dragStartPoint.x;
    const deltaY = worldPos.y - dragStartPoint.y;

    // FIXED: Use immediate updates during dragging to prevent flickering
    draggedObjects.forEach(obj => {
      const originalPos = originalObjectPositions[obj.id];
      if (originalPos) {
        const updatedObject = {
          ...obj,
          bounds: {
            ...obj.bounds,
            x: originalPos.x + deltaX,
            y: originalPos.y + deltaY
          },
          isDirty: true
        };
        if (onObjectUpdate) {
          onObjectUpdate(updatedObject);
        }
      }
    });
    
    return;
  }

  // Handle selection box dragging
  if (isSelecting && activeTool === 'select') {
    const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    // removed(worldPos);
    
    // Update selection box
    const box = {
      x: Math.min(selectionStart.x, worldPos.x),
      y: Math.min(selectionStart.y, worldPos.y),
      width: Math.abs(worldPos.x - selectionStart.x),
      height: Math.abs(worldPos.y - selectionStart.y)
    };
    setSelectionBox(box);
    
    return;
  }

  // Handle regular shape drawing
  if (isDrawing && activeTool !== 'select' && activeTool !== 'line') {
    const worldPos = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    // removed(worldPos);
    
    // Update preview object
    const bounds = {
      x: Math.min(drawStartPoint.x, worldPos.x),
      y: Math.min(drawStartPoint.y, worldPos.y),
      width: Math.abs(worldPos.x - drawStartPoint.x),
      height: Math.abs(worldPos.y - drawStartPoint.y)
    };

    // Always create preview object, even for tiny sizes
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
}, [isPanning, lastPanPoint, viewport.x, viewport.y, panTo, isDrawing, isDrawingLine, isSelecting, selectionStart, isDragging, draggedObjects, dragStartPoint, originalObjectPositions, isResizing, resizeHandle, resizeStartBounds, resizeStartPoint, selectedIds, objects, activeTool, screenToWorld, drawStartPoint, linePoints, onObjectUpdate]);

// FIXED: Minimal throttling approach - only throttle non-critical operations
const lastMoveTime = useRef(0);

const handleMouseMove = useCallback((event: React.MouseEvent) => {
  const now = performance.now();
  
  // FIXED: No throttling during interactive operations to maintain smoothness
  if (isDragging || isDrawing || isDrawingLine) {
    handleMouseMoveThrottled(event);
    return;
  }

  // Light throttling only for panning with many objects
  if (isPanning && objects.length > 200) {
    // Only throttle panning when there are many objects
    const panDelay = 16; // 60fps max
    if (now - lastMoveTime.current < panDelay) {
      return;
    }
    lastMoveTime.current = now;
  }
  
  handleMouseMoveThrottled(event);
}, [isDragging, isPanning, objects.length, handleMouseMoveThrottled, isDrawing, isDrawingLine]);
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
    setDraggedObjects([]);
    setOriginalObjectPositions({});
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStartBounds(null);
    
    // Complete selection box
    if (isSelecting && selectionBox && onObjectClick) {
      // Find objects that intersect with selection box
      const selectedObjectIds: string[] = [];
      objects.forEach(obj => {
        if (!obj.visible || obj.locked) return;
        
        // Check if object intersects with selection box
        const objRight = obj.bounds.x + obj.bounds.width;
        const objBottom = obj.bounds.y + obj.bounds.height;
        const boxRight = selectionBox.x + selectionBox.width;
        const boxBottom = selectionBox.y + selectionBox.height;
        
        const intersects = !(
          objRight < selectionBox.x ||
          obj.bounds.x > boxRight ||
          objBottom < selectionBox.y ||
          obj.bounds.y > boxBottom
        );
        
        if (intersects) {
          selectedObjectIds.push(obj.id);
        }
      });
      
      // Update selection
      if (selectedObjectIds.length > 0) {
        // Create a synthetic event for multi-select
        const syntheticEvent = {
          ctrlKey: true,
          metaKey: false,
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.MouseEvent;
        
        // Select all found objects
        selectedObjectIds.forEach((id, index) => {
          if (index === 0) {
            // First object - check if we should add to existing selection or replace
            const shouldAddToSelection = selectedIds.length > 0;
            const eventToUse = shouldAddToSelection ? syntheticEvent : ({
              ctrlKey: false,
              metaKey: false,
              preventDefault: () => {},
              stopPropagation: () => {}
            } as React.MouseEvent);
            onObjectClick(id, eventToUse);
          } else {
            // Additional objects - always add to selection
            onObjectClick(id, syntheticEvent);
          }
        });
      }
    }
    
    // Reset selection box state
    setIsSelecting(false);
    setSelectionBox(null);
    
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
      if (finalObject.bounds.width > 2 && finalObject.bounds.height > 2) {
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
  }, [isDrawing, isDrawingLine, isSelecting, linePoints, previewObject, selectionBox, selectedIds, objects, onObjectCreate, onObjectClick]);

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

  // Notify parent of viewport changes
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange(viewport);
    }
  }, [viewport, onViewportChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle ANY shortcuts when editing text
      if (editingTextId) return;
      
      // Don't handle shortcuts if focused on input elements
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputFocused) return;
      
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

      // Arrow key panning - use non-animated panning to prevent flickering
      if (!event.ctrlKey && !event.metaKey) {
        const panStep = 50;
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            panTo(viewport.x, viewport.y + panStep, false); // Changed to false for no animation
            break;
          case 'ArrowDown':
            event.preventDefault();
            panTo(viewport.x, viewport.y - panStep, false); // Changed to false for no animation
            break;
          case 'ArrowLeft':
            event.preventDefault();
            panTo(viewport.x + panStep, viewport.y, false); // Changed to false for no animation
            break;
          case 'ArrowRight':
            event.preventDefault();
            panTo(viewport.x - panStep, viewport.y, false); // Changed to false for no animation
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Don't handle ANY shortcuts when editing text
      if (editingTextId) return;
      
      // Don't handle shortcuts if focused on input elements
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputFocused) return;
      
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
    if (isSelecting) return 'crosshair';
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
        return 'pointer'; // Show pointer cursor for select tool to indicate clickable objects
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
      
      {/* High Performance Renderer - targeting 125+ FPS */}
      <HighPerformanceRenderer
        objects={previewObject ? [...objects, previewObject] : objects}
        viewport={viewport}
        selectedIds={selectedIds}
        isPanning={isPanning}
        isDragging={isDragging}
      />
      
      {/* Selection outlines now handled in MemoryOptimizedRenderer */}
      
      {/* Canvas Info Overlay - FIXED POSITIONING */}
      <div className="modern-canvas-info absolute top-4 right-4 z-10 pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Smart Instructions Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
        <div 
          className="modern-canvas-info"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            textAlign: 'center'
          }}
        >
          {(() => {
            // Smart instructions based on current tool and activity
            if (activeTool === 'rectangle') {
              return "Click and drag to draw rectangles • Press V to switch to select tool";
            } else if (activeTool === 'circle') {
              return "Click and drag to draw circles • Press V to switch to select tool";
            } else if (activeTool === 'text') {
              return "Click and drag to create text boxes • Press V to switch to select tool";
            } else if (activeTool === 'line') {
              return "Click to start drawing lines, click again to add points • Press V to switch to select tool";
            } else if (objects.length === 0 && showWelcome) {
              // First-time user guidance
              return "Welcome! Press R for Rectangle, C for Circle, T for Text, L for Line • Wheel to zoom, Space+drag to pan";
            } else if (objects.length === 0) {
              // User has started interacting
              return "Press R/C/T/L to draw • Click to select • Wheel to zoom • Space+drag to pan";
            } else if (selectedIds.length > 0) {
              return `${selectedIds.length} selected • Drag to move • ${getModifierKey()}+C/V: Copy/Paste • Delete to remove`;
            } else {
              return "Click objects to select • R/C/T/L: Draw tools • Wheel: Zoom • Space+drag: Pan • Double-click text to edit";
            }
          })()}
        </div>
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

      {/* Beginner's Help Overlay */}
      {objects.length === 0 && showWelcome && (
        <div 
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none"
          style={{
            background: 'rgba(59, 130, 246, 0.95)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(8px)',
            maxWidth: '500px',
            textAlign: 'center'
          }}
        >
          👆 Start by selecting a tool from the left sidebar, then click and drag on the canvas to create shapes
        </div>
      )}

      {/* Selection Box */}
      {isSelecting && selectionBox && selectionBox.width > 0 && selectionBox.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: (selectionBox.x - viewport.x) * viewport.zoom,
            top: (selectionBox.y - viewport.y) * viewport.zoom,
            width: selectionBox.width * viewport.zoom,
            height: selectionBox.height * viewport.zoom,
            border: '2px dashed var(--color-accent)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
      )}

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