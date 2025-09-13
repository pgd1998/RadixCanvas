import { useState } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { ToolPanel } from './components/Tools/ToolPanel';
import { PropertyPanel } from './components/Panels/PropertyPanel';
import { LayerPanel } from './components/Panels/LayerPanel';
import type { CanvasObject } from './types/objects';
import type { ToolType } from './types/tools';

function App() {
  const [objects, setObjects] = useState<CanvasObject[]>([
    // Demo rectangle - positioned more centrally with some offset from edges
    {
      id: '1',
      type: 'rectangle',
      bounds: { x: 150, y: 150, width: 200, height: 150 },
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
      bounds: { x: 400, y: 200, width: 120, height: 120 },
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
      bounds: { x: 200, y: 350, width: 250, height: 40 },
      style: {
        fill: '#059669',
        stroke: 'transparent',
        strokeWidth: 0,
        opacity: 1,
        fontSize: 24,
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
  const [activeTool, setActiveTool] = useState<ToolType>('select');

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

  const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));

  const handlePropertyChange = (property: string, value: any) => {
    setObjects(prev => prev.map(obj => {
      if (selectedIds.includes(obj.id)) {
        return {
          ...obj,
          style: { ...obj.style, [property]: value },
          isDirty: true
        };
      }
      return obj;
    }));
  };

  const handleObjectUpdate = (updatedObject: CanvasObject) => {
    setObjects(prev => prev.map(obj => 
      obj.id === updatedObject.id ? updatedObject : obj
    ));
  };

  const handleObjectCreate = (newObject: CanvasObject) => {
    setObjects(prev => [...prev, newObject]);
    setSelectedIds([newObject.id]);
    // Keep the current tool active for continuous drawing
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between min-h-[72px] flex-shrink-0 shadow-sm z-50 gap-6">
        <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">RadixCanvas</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 min-w-fit flex-shrink-0">
          <span className="font-medium whitespace-nowrap">Objects: {objects.length}</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="font-medium whitespace-nowrap">Selected: {selectedIds.length}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-16 bg-white border-r border-gray-200 flex-shrink-0">
          <ToolPanel 
            activeTool={activeTool} 
            onToolChange={setActiveTool}
          />
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden">
          <InfiniteCanvas
            objects={objects}
            selectedIds={selectedIds}
            activeTool={activeTool}
            showGrid={true}
            onObjectClick={handleObjectClick}
            onObjectCreate={handleObjectCreate}
            onObjectUpdate={handleObjectUpdate}
          />
        </main>

        {/* Right Sidebar - Properties & Layers */}
        <aside className="w-80 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            <PropertyPanel 
              selectedObjects={selectedObjects}
              onPropertyChange={handlePropertyChange}
            />
          </div>
          <div className="border-t border-gray-200">
            <LayerPanel 
              objects={objects}
              selectedIds={selectedIds}
              onObjectUpdate={handleObjectUpdate}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;