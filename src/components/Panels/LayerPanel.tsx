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
    <div className="h-80">
      <Accordion.Root type="single" defaultValue="layers" collapsible>
        <Accordion.Item value="layers">
          <Accordion.Header>
            <Accordion.Trigger className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 group">
              <span>Layers ({objects.length})</span>
              <ChevronDown 
                size={16} 
                className="text-gray-400 transition-transform group-data-[state=open]:rotate-180" 
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-2 pb-2">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sortedObjects.map((object) => {
                const isSelected = selectedIds.includes(object.id);
                
                return (
                  <div
                    key={object.id}
                    className={`
                      group flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-sm
                      transition-colors
                      ${isSelected 
                        ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                        : 'hover:bg-gray-100 text-gray-700'
                      }
                      ${!object.visible ? 'opacity-50' : ''}
                      ${object.locked ? 'cursor-not-allowed' : ''}
                    `}
                    onClick={(e) => handleObjectClick(object.id, e)}
                  >
                    {/* Object Icon */}
                    <span className="text-xs w-4 text-center">
                      {getObjectIcon(object.type)}
                    </span>
                    
                    {/* Object Name */}
                    <span className="flex-1 truncate">
                      {getObjectName(object)}
                    </span>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Visibility Toggle */}
                      <button
                        className="p-1 rounded hover:bg-white/50 transition-colors"
                        onClick={(e) => toggleVisibility(object, e)}
                        title={object.visible ? 'Hide' : 'Show'}
                      >
                        {object.visible ? (
                          <Eye size={12} className="text-gray-600" />
                        ) : (
                          <EyeOff size={12} className="text-gray-400" />
                        )}
                      </button>
                      
                      {/* Lock Toggle */}
                      <button
                        className="p-1 rounded hover:bg-white/50 transition-colors"
                        onClick={(e) => toggleLock(object, e)}
                        title={object.locked ? 'Unlock' : 'Lock'}
                      >
                        {object.locked ? (
                          <Lock size={12} className="text-red-600" />
                        ) : (
                          <Unlock size={12} className="text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {objects.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500">
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