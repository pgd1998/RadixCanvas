import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { Eye, EyeOff, Lock, Unlock, ChevronDown } from 'lucide-react';
import type { CanvasObject } from '../../types/objects';

interface LayerPanelProps {
  objects: CanvasObject[];
  selectedIds: string[];
  onObjectUpdate: (object: CanvasObject) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

export function LayerPanel({ objects, selectedIds, onObjectUpdate, onSelectionChange }: LayerPanelProps) {
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
    return `${object.type.charAt(0).toUpperCase() + object.type.slice(1)} ${object.id.split('-').pop()}`;
  };

  return (
    <div style={{ height: '320px' }}>
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
            <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
              {sortedObjects.map((object) => {
                const isSelected = selectedIds.includes(object.id);
                
                return (
                  <div
                    key={object.id}
                    className={`modern-layer-item ${isSelected ? 'selected' : ''}`}
                    style={{
                      opacity: !object.visible ? 0.5 : 1,
                      cursor: object.locked ? 'not-allowed' : 'pointer'
                    }}
                    onClick={(e) => handleObjectClick(object.id, e)}
                  >
                    {/* Object Icon */}
                    <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>
                      {getObjectIcon(object.type)}
                    </span>
                    
                    {/* Object Name */}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getObjectName(object)}
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
                    </div>
                  </div>
                );
              })}
              
              {objects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  No objects yet
                </div>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}