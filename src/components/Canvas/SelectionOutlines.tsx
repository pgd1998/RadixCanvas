import React from 'react';
import type { CanvasObject } from '../../types/objects';

interface SelectionOutlinesProps {
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: { x: number; y: number; zoom: number };
}

export const SelectionOutlines = React.memo(function SelectionOutlines({ objects, selectedIds, viewport }: SelectionOutlinesProps) {
  const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));

  if (selectedObjects.length === 0) return null;

  return (
    <>
      {selectedObjects.map(obj => (
        <div
          key={`selection-${obj.id}`}
          style={{
            position: 'absolute',
            left: (obj.bounds.x + obj.transform.x - viewport.x) * viewport.zoom - 2,
            top: (obj.bounds.y + obj.transform.y - viewport.y) * viewport.zoom - 2,
            width: obj.bounds.width * viewport.zoom + 4,
            height: obj.bounds.height * viewport.zoom + 4,
            border: '2px solid var(--color-accent)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 500,
            backgroundColor: 'transparent',
            boxSizing: 'border-box'
          }}
        />
      ))}
      
      {/* Multi-selection indicator */}
      {selectedObjects.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'var(--color-accent)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            fontWeight: 500,
            zIndex: 1001,
            pointerEvents: 'none'
          }}
        >
          {selectedObjects.length} objects selected
        </div>
      )}
    </>
  );
});