import React from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as Popover from '@radix-ui/react-popover';
import type { CanvasObject } from '../../types/objects';

interface PropertyPanelProps {
  selectedObjects: CanvasObject[];
  onPropertyChange: (property: string, value: any) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

function ColorPicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (color: string) => void; 
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button 
            className="w-full h-8 rounded border border-gray-300 flex items-center px-2 gap-2 hover:border-gray-400 transition-colors"
          >
            <div 
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-mono">{value}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64"
            sideOffset={8}
          >
            <div className="grid grid-cols-6 gap-2 mb-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 rounded border border-gray-300"
            />
            <Popover.Arrow className="fill-white stroke-gray-200 stroke-[1px]" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export function PropertyPanel({ selectedObjects, onPropertyChange }: PropertyPanelProps) {
  if (selectedObjects.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Properties</h3>
        <p className="text-sm text-gray-500">Select an object to edit properties</p>
      </div>
    );
  }

  const firstObject = selectedObjects[0];
  const isMultiSelect = selectedObjects.length > 1;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Properties
          {isMultiSelect && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({selectedObjects.length} selected)
            </span>
          )}
        </h3>
      </div>

      {/* Fill Color */}
      <ColorPicker
        value={firstObject.style.fill}
        onChange={(color) => onPropertyChange('fill', color)}
        label="Fill"
      />

      {/* Stroke Color */}
      <ColorPicker
        value={firstObject.style.stroke}
        onChange={(color) => onPropertyChange('stroke', color)}
        label="Stroke"
      />

      {/* Stroke Width */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Stroke Width
        </label>
        <div className="space-y-2">
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[firstObject.style.strokeWidth]}
            onValueChange={([value]) => onPropertyChange('strokeWidth', value)}
            max={10}
            min={0}
            step={1}
          >
            <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb 
              className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Stroke width"
            />
          </Slider.Root>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span className="font-medium">{firstObject.style.strokeWidth}px</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Opacity
        </label>
        <div className="space-y-2">
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[firstObject.style.opacity * 100]}
            onValueChange={([value]) => onPropertyChange('opacity', value / 100)}
            max={100}
            min={0}
            step={5}
          >
            <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb 
              className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Opacity"
            />
          </Slider.Root>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span className="font-medium">{Math.round(firstObject.style.opacity * 100)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Text-specific properties */}
      {firstObject.type === 'text' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Font Size
            </label>
            <div className="space-y-2">
              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[firstObject.style.fontSize || 16]}
                onValueChange={([value]) => onPropertyChange('fontSize', value)}
                max={72}
                min={8}
                step={1}
              >
                <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                  <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb 
                  className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Font size"
                />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500">
                <span>8px</span>
                <span className="font-medium">{firstObject.style.fontSize || 16}px</span>
                <span>72px</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Font Family
            </label>
            <select
              value={firstObject.style.fontFamily || 'Arial'}
              onChange={(e) => onPropertyChange('fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
        </>
      )}

      {/* Rectangle-specific properties */}
      {firstObject.type === 'rectangle' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Corner Radius
          </label>
          <div className="space-y-2">
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[firstObject.style.cornerRadius || 0]}
              onValueChange={([value]) => onPropertyChange('cornerRadius', value)}
              max={50}
              min={0}
              step={1}
            >
              <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb 
                className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Corner radius"
              />
            </Slider.Root>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0px</span>
              <span className="font-medium">{firstObject.style.cornerRadius || 0}px</span>
              <span>50px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}