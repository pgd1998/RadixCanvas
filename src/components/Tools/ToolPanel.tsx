import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { MousePointer, Square, Circle, Type, Minus } from 'lucide-react';
import type { ToolType } from '../../types/tools';

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools = [
  {
    id: 'select' as ToolType,
    name: 'Select',
    description: 'Select and move objects',
    icon: MousePointer,
    shortcut: 'V',
  },
  {
    id: 'rectangle' as ToolType,
    name: 'Rectangle',
    description: 'Draw rectangles',
    icon: Square,
    shortcut: 'R',
  },
  {
    id: 'circle' as ToolType,
    name: 'Circle',
    description: 'Draw circles and ellipses',
    icon: Circle,
    shortcut: 'C',
  },
  {
    id: 'text' as ToolType,
    name: 'Text',
    description: 'Add text labels',
    icon: Type,
    shortcut: 'T',
  },
  {
    id: 'line' as ToolType,
    name: 'Line',
    description: 'Draw lines and paths',
    icon: Minus,
    shortcut: 'L',
  }
];

export function ToolPanel({ activeTool, onToolChange }: ToolPanelProps) {
  const handleToolClick = (toolId: ToolType) => {
    onToolChange(toolId);
  };

  return (
    <Tooltip.Provider>
      <div className="flex flex-col p-2 gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <Tooltip.Root key={tool.id}>
              <Tooltip.Trigger asChild>
                <button
                  className={`modern-tool ${isActive ? 'active' : ''}`}
                  onClick={() => handleToolClick(tool.id)}
                >
                  <Icon size={18} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="modern-tooltip"
                  side="right"
                  sideOffset={8}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 600 }}>
                      {tool.name}
                      {tool.shortcut && (
                        <span style={{ marginLeft: '8px', opacity: 0.7, fontWeight: 400 }}>({tool.shortcut})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {tool.description}
                    </div>
                  </div>
                  <Tooltip.Arrow className="fill-current" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}