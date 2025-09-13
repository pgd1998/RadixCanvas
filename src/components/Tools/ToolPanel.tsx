import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { MousePointer, Square, Circle, Type } from 'lucide-react';
import type { ToolType } from '../../types/tools';

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools = [
  {
    id: 'select' as ToolType,
    name: 'Select',
    icon: MousePointer,
    shortcut: 'V',
  },
  {
    id: 'rectangle' as ToolType,
    name: 'Rectangle',
    icon: Square,
    shortcut: 'R',
  },
  {
    id: 'circle' as ToolType,
    name: 'Circle', 
    icon: Circle,
    shortcut: 'C',
  },
  {
    id: 'text' as ToolType,
    name: 'Text',
    icon: Type,
    shortcut: 'T',
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
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-white hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                  onClick={() => handleToolClick(tool.id)}
                >
                  <Icon size={18} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-900 text-white px-2 py-1 rounded text-sm"
                  side="right"
                  sideOffset={8}
                >
                  {tool.name}
                  {tool.shortcut && (
                    <span className="ml-2 text-gray-400">({tool.shortcut})</span>
                  )}
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}