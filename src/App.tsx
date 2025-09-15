import { useState, useEffect, useCallback } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { ToolPanel } from './components/Tools/ToolPanel';
import { PropertyPanel } from './components/Panels/PropertyPanel';
import { LayerPanel } from './components/Panels/LayerPanel';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import { PerformancePanel } from './components/Debug/PerformancePanel';
import type { CanvasObject } from './types/objects';
import type { ToolType } from './types/tools';
import { Download } from 'lucide-react';
import { isModifierPressed } from './utils/platform';
import './styles/modern.css';

function App() {
  const [objects, setObjects] = useState<CanvasObject[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [clipboard, setClipboard] = useState<CanvasObject[]>([]);

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

  const handleObjectUpdate = useCallback((updatedObject: CanvasObject) => {
    setObjects(prev => prev.map(obj => 
      obj.id === updatedObject.id ? updatedObject : obj
    ));
  }, []);


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

  const handleCopy = useCallback(() => {
    const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
    if (selectedObjects.length > 0) {
      setClipboard([...selectedObjects]);
    }
  }, [objects, selectedIds]);

  const handlePaste = useCallback(() => {
    if (clipboard.length > 0) {
      const pastedObjects = clipboard.map(obj => ({
        ...obj,
        id: `obj-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        bounds: {
          ...obj.bounds,
          x: obj.bounds.x + 20, // Offset pasted objects
          y: obj.bounds.y + 20
        },
        layer: Math.max(...objects.map(o => o.layer), 0) + 1,
        isDirty: true
      }));
      
      setObjects(prev => [...prev, ...pastedObjects]);
      setSelectedIds(pastedObjects.map(obj => obj.id));
    }
  }, [clipboard, objects]);

  const handleSelectAll = useCallback(() => {
    const visibleObjectIds = objects
      .filter(obj => obj.visible && !obj.locked)
      .map(obj => obj.id);
    setSelectedIds(visibleObjectIds);
  }, [objects]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleDuplicate = useCallback(() => {
    handleCopy();
    setTimeout(handlePaste, 10); // Small delay to ensure clipboard is set
  }, [handleCopy, handlePaste]);

  // Layer management functions
  const handleLayerReorder = useCallback((objectId: string, newLayer: number) => {
    setObjects(prev => {
      // Find the object being moved
      const objectToMove = prev.find(obj => obj.id === objectId);
      if (!objectToMove) return prev;

      // Update all objects' layers to accommodate the reordering
      return prev.map(obj => {
        if (obj.id === objectId) {
          return { ...obj, layer: newLayer, isDirty: true };
        }
        
        // Adjust other objects' layers if necessary
        if (objectToMove.layer < newLayer && obj.layer > objectToMove.layer && obj.layer <= newLayer) {
          return { ...obj, layer: obj.layer - 1, isDirty: true };
        } else if (objectToMove.layer > newLayer && obj.layer >= newLayer && obj.layer < objectToMove.layer) {
          return { ...obj, layer: obj.layer + 1, isDirty: true };
        }
        
        return obj;
      });
    });
  }, []);

  const handleObjectDelete = useCallback((objectId: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== objectId));
    setSelectedIds(prev => prev.filter(id => id !== objectId));
  }, []);

  const handleBulkOperation = useCallback((operation: 'hide' | 'show' | 'lock' | 'unlock' | 'delete', objectIds: string[]) => {
    switch (operation) {
      case 'hide':
        setObjects(prev => prev.map(obj => 
          objectIds.includes(obj.id) ? { ...obj, visible: false, isDirty: true } : obj
        ));
        break;
      case 'show':
        setObjects(prev => prev.map(obj => 
          objectIds.includes(obj.id) ? { ...obj, visible: true, isDirty: true } : obj
        ));
        break;
      case 'lock':
        setObjects(prev => prev.map(obj => 
          objectIds.includes(obj.id) ? { ...obj, locked: true, isDirty: true } : obj
        ));
        break;
      case 'unlock':
        setObjects(prev => prev.map(obj => 
          objectIds.includes(obj.id) ? { ...obj, locked: false, isDirty: true } : obj
        ));
        break;
      case 'delete':
        setObjects(prev => prev.filter(obj => !objectIds.includes(obj.id)));
        setSelectedIds(prev => prev.filter(id => !objectIds.includes(id)));
        break;
    }
  }, []);

  // Performance testing functions
  const handleStressTest = useCallback((stressObjects: CanvasObject[]) => {
    setObjects(prev => [...prev, ...stressObjects]);
  }, []);

  const handleClearObjects = useCallback(() => {
    setObjects([]);
    setSelectedIds([]);
  }, []);


  // Keyboard event handler for shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if we're not focused on an input element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputFocused) return;

      // Delete/Backspace - Delete selected objects
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedIds.length > 0) {
          event.preventDefault();
          setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id)));
          setSelectedIds([]);
        }
        return;
      }

      // Handle Ctrl/Cmd combinations (cross-platform support)
      if (isModifierPressed(event)) {
        switch (event.key.toLowerCase()) {
          case 'c':
            event.preventDefault();
            handleCopy();
            break;
          case 'v':
            event.preventDefault();
            handlePaste();
            break;
          case 'd':
            event.preventDefault();
            handleDuplicate();
            break;
          case 'a':
            event.preventDefault();
            handleSelectAll();
            break;
        }
        return;
      }

      // Tool shortcuts (only when no modifiers)
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'v':
            event.preventDefault();
            setActiveTool('select');
            break;
          case 'r':
            event.preventDefault();
            setActiveTool('rectangle');
            break;
          case 'c':
            event.preventDefault();
            setActiveTool('circle');
            break;
          case 't':
            event.preventDefault();
            setActiveTool('text');
            break;
          case 'l':
            event.preventDefault();
            setActiveTool('line');
            break;
          case 'escape':
            event.preventDefault();
            handleDeselectAll();
            setActiveTool('select');
            break;
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, handleCopy, handlePaste, handleDuplicate, handleSelectAll, handleDeselectAll, setActiveTool]);

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
          {objects.length === 0 ? (
            <span className="whitespace-nowrap text-sm" style={{ color: 'var(--color-text-muted)' }}>
              🎨 Start by selecting a tool from the left sidebar
            </span>
          ) : (
            <>
              <span className="whitespace-nowrap">Objects: {objects.length}</span>
              <div className="w-px h-4 bg-current opacity-20"></div>
              <span className="whitespace-nowrap">Selected: {selectedIds.length}</span>
            </>
          )}
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
            onLayerReorder={handleLayerReorder}
            onObjectDelete={handleObjectDelete}
            onBulkOperation={handleBulkOperation}
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

      {/* Performance Monitoring Panel */}
      <PerformancePanel
        objectCount={objects.length}
        onStressTest={handleStressTest}
        onClearObjects={handleClearObjects}
      />
    </div>
  );
}

export default App;