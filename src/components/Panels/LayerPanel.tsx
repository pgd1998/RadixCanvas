import React, { useState, useRef } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Eye, EyeOff, Lock, Unlock, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import type { CanvasObject } from '../../types/objects';

interface LayerPanelProps {
  objects: CanvasObject[];
  selectedIds: string[];
  onObjectUpdate: (object: CanvasObject) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onLayerReorder?: (objectId: string, newLayer: number) => void;
  onObjectDelete?: (objectId: string) => void;
  onBulkOperation?: (operation: 'hide' | 'show' | 'lock' | 'unlock' | 'delete', objectIds: string[]) => void;
}

export function LayerPanel({ 
  objects, 
  selectedIds, 
  onObjectUpdate, 
  onSelectionChange, 
  onLayerReorder,
  onObjectDelete,
  onBulkOperation 
}: LayerPanelProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const dragCounter = useRef(0);
  
  const sortedObjects = [...objects].sort((a, b) => b.layer - a.layer);

  const handleObjectClick = (objectId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      onSelectionChange(
        selectedIds.includes(objectId)
          ? selectedIds.filter(id => id !== objectId)
          : [...selectedIds, objectId]
      );
    } else {
      // Single select
      onSelectionChange([objectId]);
    }
  };

  const toggleVisibility = (object: CanvasObject, event: React.MouseEvent) => {
    event.stopPropagation();
    onObjectUpdate({
      ...object,
      visible: !object.visible,
      isDirty: true
    });
  };

  const toggleLock = (object: CanvasObject, event: React.MouseEvent) => {
    event.stopPropagation();
    onObjectUpdate({
      ...object,
      locked: !object.locked,
      isDirty: true
    });
  };

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'rectangle': return '⬜';
      case 'circle': return '⚫';
      case 'text': return 'T';
      case 'line': return '📏';
      default: return '?';
    }
  };

  const getObjectName = (object: CanvasObject) => {
    if (object.type === 'text' && object.text) {
      return object.text.substring(0, 20) + (object.text.length > 20 ? '...' : '');
    }
    
    // Generate smart layer names based on type and position in layer stack
    const sameTypeObjects = objects.filter(obj => obj.type === object.type);
    const index = sameTypeObjects.findIndex(obj => obj.id === object.id) + 1;
    
    switch (object.type) {
      case 'rectangle':
        return `Rectangle ${index}`;
      case 'circle':
        return `Circle ${index}`;
      case 'line':
        return `Line ${index}`;
      default:
        return `${object.type.charAt(0).toUpperCase() + object.type.slice(1)} ${index}`;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, objectId: string) => {
    setDraggedItem(objectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', objectId);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, objectId: string) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverItem(objectId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetObjectId: string) => {
    e.preventDefault();
    const draggedObjectId = e.dataTransfer.getData('text/plain');
    
    if (draggedObjectId && draggedObjectId !== targetObjectId && onLayerReorder) {
      const draggedObject = objects.find(obj => obj.id === draggedObjectId);
      const targetObject = objects.find(obj => obj.id === targetObjectId);
      
      if (draggedObject && targetObject) {
        onLayerReorder(draggedObjectId, targetObject.layer);
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  // Bulk operations
  const handleBulkOperation = (operation: 'hide' | 'show' | 'lock' | 'unlock' | 'delete') => {
    if (onBulkOperation && selectedIds.length > 0) {
      onBulkOperation(operation, selectedIds);
    }
  };

  const deleteObject = (objectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onObjectDelete) {
      onObjectDelete(objectId);
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Accordion.Root type="single" defaultValue="layers" collapsible>
        <Accordion.Item value="layers">
          <Accordion.Header>
            <Accordion.Trigger className="modern-accordion-trigger">
              <span>Layers ({objects.length})</span>
              <ChevronDown 
                size={16} 
                className="modern-accordion-chevron" 
                style={{ color: 'var(--color-text-muted)' }}
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="modern-accordion-content">
            {/* Bulk Operations */}
            {selectedIds.length > 1 && (
              <div style={{ 
                padding: 'var(--spacing-sm)', 
                background: 'var(--color-bg-tertiary)', 
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-sm)',
                display: 'flex',
                gap: 'var(--spacing-xs)',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  {selectedIds.length} selected:
                </span>
                <button
                  onClick={() => handleBulkOperation('hide')}
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '11px', 
                    background: 'var(--color-bg-secondary)', 
                    border: '1px solid var(--color-border-light)', 
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  title="Hide all selected"
                >
                  Hide
                </button>
                <button
                  onClick={() => handleBulkOperation('lock')}
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '11px', 
                    background: 'var(--color-bg-secondary)', 
                    border: '1px solid var(--color-border-light)', 
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  title="Lock all selected"
                >
                  Lock
                </button>
                <button
                  onClick={() => handleBulkOperation('delete')}
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '11px', 
                    background: 'var(--color-error)', 
                    border: 'none', 
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  title="Delete all selected"
                >
                  Delete
                </button>
              </div>
            )}

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {sortedObjects.map((object) => {
                const isSelected = selectedIds.includes(object.id);
                const isDragged = draggedItem === object.id;
                const isDragOver = dragOverItem === object.id;
                
                return (
                  <div
                    key={object.id}
                    draggable={!object.locked}
                    className={`modern-layer-item ${isSelected ? 'selected' : ''}`}
                    style={{
                      opacity: !object.visible ? 0.5 : isDragged ? 0.5 : 1,
                      cursor: object.locked ? 'not-allowed' : 'grab',
                      border: isDragOver ? '2px solid var(--color-accent)' : 'none',
                      borderRadius: 'var(--radius-sm)',
                      transform: isDragged ? 'rotate(2deg)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                    onClick={(e) => handleObjectClick(object.id, e)}
                    onDragStart={(e) => handleDragStart(e, object.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, object.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, object.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Drag Handle */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: object.locked ? 'not-allowed' : 'grab',
                      opacity: object.locked ? 0.3 : 0.6
                    }}>
                      <GripVertical size={12} />
                    </div>

                    {/* Layer Thumbnail */}
                    <div style={{ 
                      width: '24px', 
                      height: '18px', 
                      background: object.style.fill || 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px'
                    }}>
                      {getObjectIcon(object.type)}
                    </div>
                    
                    {/* Object Name */}
                    <span style={{ 
                      flex: 1, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      fontSize: '13px',
                      fontWeight: isSelected ? 500 : 400
                    }}>
                      {getObjectName(object)}
                    </span>
                    
                    {/* Layer Number */}
                    <span style={{ 
                      fontSize: '10px', 
                      color: 'var(--color-text-muted)',
                      minWidth: '20px',
                      textAlign: 'right'
                    }}>
                      {object.layer}
                    </span>
                    
                    {/* Controls */}
                    <div className="modern-layer-controls">
                      {/* Visibility Toggle */}
                      <button
                        className="modern-layer-control"
                        onClick={(e) => toggleVisibility(object, e)}
                        title={object.visible ? 'Hide' : 'Show'}
                      >
                        {object.visible ? (
                          <Eye size={12} style={{ color: 'var(--color-text-secondary)' }} />
                        ) : (
                          <EyeOff size={12} style={{ color: 'var(--color-text-muted)' }} />
                        )}
                      </button>
                      
                      {/* Lock Toggle */}
                      <button
                        className="modern-layer-control"
                        onClick={(e) => toggleLock(object, e)}
                        title={object.locked ? 'Unlock' : 'Lock'}
                      >
                        {object.locked ? (
                          <Lock size={12} style={{ color: 'var(--color-error)' }} />
                        ) : (
                          <Unlock size={12} style={{ color: 'var(--color-text-secondary)' }} />
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        className="modern-layer-control"
                        onClick={(e) => deleteObject(object.id, e)}
                        title="Delete layer"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {objects.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '32px', 
                  fontSize: '13px', 
                  color: 'var(--color-text-muted)' 
                }}>
                  No objects yet
                  <br />
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                    Create shapes to see them here
                  </span>
                </div>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}