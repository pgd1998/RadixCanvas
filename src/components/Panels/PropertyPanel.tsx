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
    <div className="modern-field">
      <label className="modern-label">{label}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="modern-color-button">
            <div 
              className="modern-color-swatch"
              style={{ backgroundColor: value }}
            />
            <span>{value}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content 
            className="modern-popover"
            sideOffset={8}
          >
            <div className="modern-color-grid">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className="modern-color-preset"
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: '100%', height: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}
            />
            <Popover.Arrow className="fill-current" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export function PropertyPanel({ selectedObjects, onPropertyChange }: PropertyPanelProps) {
  if (selectedObjects.length === 0) {
    return (
      <div className="modern-section">
        <h3>Properties</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Select an object to edit properties</p>
      </div>
    );
  }

  const firstObject = selectedObjects[0];
  const isMultiSelect = selectedObjects.length > 1;

  return (
    <div>
      <div className="modern-section">
        <h3>
          Properties
          {isMultiSelect && (
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '8px' }}>
              ({selectedObjects.length} selected)
            </span>
          )}
        </h3>
      </div>

      <div className="modern-section">
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
        <div className="modern-field">
          <label className="modern-label">Stroke Width</label>
          <Slider.Root
            className="modern-slider-root"
            value={[firstObject.style.strokeWidth]}
            onValueChange={([value]) => onPropertyChange('strokeWidth', value)}
            max={10}
            min={0}
            step={1}
          >
            <Slider.Track className="modern-slider-track">
              <Slider.Range className="modern-slider-range" />
            </Slider.Track>
            <Slider.Thumb 
              className="modern-slider-thumb"
              aria-label="Stroke width"
            />
          </Slider.Root>
          <div className="modern-slider-labels">
            <span>0</span>
            <span className="current">{firstObject.style.strokeWidth}px</span>
            <span>10</span>
          </div>
        </div>

        {/* Opacity */}
        <div className="modern-field">
          <label className="modern-label">Opacity</label>
          <Slider.Root
            className="modern-slider-root"
            value={[firstObject.style.opacity * 100]}
            onValueChange={([value]) => onPropertyChange('opacity', value / 100)}
            max={100}
            min={0}
            step={5}
          >
            <Slider.Track className="modern-slider-track">
              <Slider.Range className="modern-slider-range" />
            </Slider.Track>
            <Slider.Thumb 
              className="modern-slider-thumb"
              aria-label="Opacity"
            />
          </Slider.Root>
          <div className="modern-slider-labels">
            <span>0%</span>
            <span className="current">{Math.round(firstObject.style.opacity * 100)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Text-specific properties */}
      {firstObject.type === 'text' && (
        <div className="modern-section">
          <div className="modern-field">
            <label className="modern-label">Font Size</label>
            <Slider.Root
              className="modern-slider-root"
              value={[firstObject.style.fontSize || 16]}
              onValueChange={([value]) => onPropertyChange('fontSize', value)}
              max={72}
              min={8}
              step={1}
            >
              <Slider.Track className="modern-slider-track">
                <Slider.Range className="modern-slider-range" />
              </Slider.Track>
              <Slider.Thumb 
                className="modern-slider-thumb"
                aria-label="Font size"
              />
            </Slider.Root>
            <div className="modern-slider-labels">
              <span>8px</span>
              <span className="current">{firstObject.style.fontSize || 16}px</span>
              <span>72px</span>
            </div>
          </div>

          <div className="modern-field">
            <label className="modern-label">Font Family</label>
            <select
              value={firstObject.style.fontFamily || 'Arial'}
              onChange={(e) => onPropertyChange('fontFamily', e.target.value)}
              className="modern-select"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
        </div>
      )}

      {/* Rectangle-specific properties */}
      {firstObject.type === 'rectangle' && (
        <div className="modern-section">
          <div className="modern-field">
            <label className="modern-label">Corner Radius</label>
            <Slider.Root
              className="modern-slider-root"
              value={[firstObject.style.cornerRadius || 0]}
              onValueChange={([value]) => onPropertyChange('cornerRadius', value)}
              max={50}
              min={0}
              step={1}
            >
              <Slider.Track className="modern-slider-track">
                <Slider.Range className="modern-slider-range" />
              </Slider.Track>
              <Slider.Thumb 
                className="modern-slider-thumb"
                aria-label="Corner radius"
              />
            </Slider.Root>
            <div className="modern-slider-labels">
              <span>0px</span>
              <span className="current">{firstObject.style.cornerRadius || 0}px</span>
              <span>50px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}