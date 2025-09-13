import { useState, useEffect } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { ToolPanel } from './components/Tools/ToolPanel';
import { PropertyPanel } from './components/Panels/PropertyPanel';
import { LayerPanel } from './components/Panels/LayerPanel';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import type { CanvasObject } from './types/objects';
import type { ToolType } from './types/tools';
import { Download, Menu } from 'lucide-react';
import './styles/modern.css';

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

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

  const handleProjectLoad = (loadedObjects: CanvasObject[], loadedViewport: { x: number; y: number; zoom: number }) => {
    setObjects(loadedObjects);
    setViewport(loadedViewport);
    setSelectedIds([]);
  };

  // Keyboard event handler for delete functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only delete if we're not focused on an input element
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' || 
                              (activeElement as HTMLElement)?.contentEditable === 'true';
        
        if (!isInputFocused && selectedIds.length > 0) {
          event.preventDefault();
          // Directly perform the deletion logic here to avoid dependency issues
          setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id)));
          setSelectedIds([]);
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds]);

  return (
    <div className="modern-app w-screen h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="modern-header px-8 py-4 flex items-center justify-between min-h-[72px] flex-shrink-0 z-50 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="flex-shrink-0">RadixCanvas</h1>
          <button
            onClick={() => setExportDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-colors text-sm font-medium"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
        <div className="modern-stats flex items-center gap-3 min-w-fit flex-shrink-0">
          <span className="whitespace-nowrap">Objects: {objects.length}</span>
          <div className="w-px h-4 bg-current opacity-20"></div>
          <span className="whitespace-nowrap">Selected: {selectedIds.length}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="modern-sidebar w-16 flex-shrink-0">
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
            onViewportChange={setViewport}
          />
        </main>

        {/* Right Sidebar - Properties & Layers */}
        <aside className="modern-property-panel w-80 flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            <PropertyPanel 
              selectedObjects={selectedObjects}
              onPropertyChange={handlePropertyChange}
            />
          </div>
          <LayerPanel 
            objects={objects}
            selectedIds={selectedIds}
            onObjectUpdate={handleObjectUpdate}
            onSelectionChange={setSelectedIds}
          />
        </aside>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        objects={objects}
        selectedIds={selectedIds}
        viewport={viewport}
        onProjectLoad={handleProjectLoad}
      />
    </div>
  );
}

export default App;