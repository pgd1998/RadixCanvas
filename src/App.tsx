import { useState } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import type { CanvasObject } from './types/objects';

function App() {
  const [objects, setObjects] = useState<CanvasObject[]>([
    // Demo rectangle
    {
      id: '1',
      type: 'rectangle',
      bounds: { x: 100, y: 100, width: 200, height: 150 },
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        opacity: 1
      },
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      layer: 0,
      visible: true,
      locked: false,
      isDirty: false
    },
    // Demo circle
    {
      id: '2',
      type: 'circle',
      bounds: { x: 350, y: 150, width: 120, height: 120 },
      style: {
        fill: '#ef4444',
        stroke: '#dc2626',
        strokeWidth: 2,
        opacity: 1
      },
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      layer: 1,
      visible: true,
      locked: false,
      isDirty: false
    },
    // Demo text
    {
      id: '3',
      type: 'text',
      bounds: { x: 150, y: 300, width: 200, height: 40 },
      style: {
        fill: '#059669',
        stroke: 'transparent',
        strokeWidth: 0,
        opacity: 1,
        fontSize: 20,
        fontFamily: 'Arial',
        textAlign: 'left'
      },
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
      visible: true,
      locked: false,
      isDirty: false,
      text: 'Hello RadixCanvas!'
    }
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleObjectClick = (objectId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedIds(prev => 
        prev.includes(objectId)
          ? prev.filter(id => id !== objectId)
          : [...prev, objectId]
      );
    } else {
      // Single select
      setSelectedIds(objectId ? [objectId] : []);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between min-h-[64px] flex-shrink-0 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">RadixCanvas</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium">Objects: {objects.length}</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="font-medium">Selected: {selectedIds.length}</span>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 overflow-hidden">
        <InfiniteCanvas
          objects={objects}
          selectedIds={selectedIds}
          showGrid={true}
          onObjectClick={handleObjectClick}
        />
      </main>
    </div>
  );
}

export default App;
