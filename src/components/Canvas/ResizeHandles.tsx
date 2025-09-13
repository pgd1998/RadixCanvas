import React from 'react';
import type { CanvasObject } from '../../types/objects';
import type { ViewportState } from '../../types/canvas';
import type { ResizeHandle } from '../../types/tools';

interface ResizeHandlesProps {
  object: CanvasObject;
  viewport: ViewportState;
  onResizeStart?: (handle: ResizeHandle, event: React.MouseEvent) => void;
}

export function ResizeHandles({ object, viewport, onResizeStart }: ResizeHandlesProps) {
  const handleSize = 8; // Fixed size in screen pixels
  const handleOffset = handleSize / 2;

  // Transform world coordinates to screen coordinates
  const worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: (worldX * viewport.zoom) + viewport.x,
      y: (worldY * viewport.zoom) + viewport.y
    };
  };

  // Calculate handle positions in world space, then convert to screen space
  const worldHandles = [
    // Corner handles
    { type: 'nw', worldX: object.bounds.x, worldY: object.bounds.y, cursor: 'nw-resize' },
    { type: 'ne', worldX: object.bounds.x + object.bounds.width, worldY: object.bounds.y, cursor: 'ne-resize' },
    { type: 'sw', worldX: object.bounds.x, worldY: object.bounds.y + object.bounds.height, cursor: 'sw-resize' },
    { type: 'se', worldX: object.bounds.x + object.bounds.width, worldY: object.bounds.y + object.bounds.height, cursor: 'se-resize' },
    
    // Edge handles
    { type: 'n', worldX: object.bounds.x + object.bounds.width / 2, worldY: object.bounds.y, cursor: 'n-resize' },
    { type: 's', worldX: object.bounds.x + object.bounds.width / 2, worldY: object.bounds.y + object.bounds.height, cursor: 's-resize' },
    { type: 'w', worldX: object.bounds.x, worldY: object.bounds.y + object.bounds.height / 2, cursor: 'w-resize' },
    { type: 'e', worldX: object.bounds.x + object.bounds.width, worldY: object.bounds.y + object.bounds.height / 2, cursor: 'e-resize' },
  ];

  // Convert to screen space handles
  const handles: ResizeHandle[] = worldHandles.map(handle => {
    const screenPos = worldToScreen(handle.worldX, handle.worldY);
    return {
      type: handle.type,
      x: screenPos.x - handleOffset,
      y: screenPos.y - handleOffset,
      cursor: handle.cursor
    };
  });

  const handleMouseDown = (handle: ResizeHandle) => (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (onResizeStart) {
      onResizeStart(handle, event);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {handles.map((handle) => (
        <div
          key={handle.type}
          className="modern-resize-handle absolute pointer-events-auto"
          style={{
            left: `${handle.x}px`,
            top: `${handle.y}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            cursor: handle.cursor
          }}
          onMouseDown={handleMouseDown(handle)}
        />
      ))}
    </div>
  );
}