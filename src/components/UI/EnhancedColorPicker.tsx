import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Tabs from '@radix-ui/react-tabs';
import { ColorWheel } from './ColorWheel';
import { Palette, Target } from 'lucide-react';

interface EnhancedColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const RECENT_COLORS_KEY = 'radixcanvas-recent-colors';

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToRecentColors(color: string) {
  try {
    const recent = getRecentColors();
    const filtered = recent.filter(c => c !== color);
    const updated = [color, ...filtered].slice(0, 12); // Keep last 12 colors
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function EnhancedColorPicker({ value, onChange, label }: EnhancedColorPickerProps) {
  const [activeTab, setActiveTab] = useState('palette');
  const [recentColors, setRecentColors] = useState(getRecentColors());

  const handleColorChange = (color: string) => {
    onChange(color);
    addToRecentColors(color);
    setRecentColors(getRecentColors());
  };

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
            style={{ width: '320px', padding: 'var(--spacing-lg)' }}
            sideOffset={8}
          >
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              {/* Tab List */}
              <Tabs.List 
                style={{ 
                  display: 'flex',
                  marginBottom: 'var(--spacing-lg)',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2px'
                }}
              >
                <Tabs.Trigger 
                  value="palette"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm)',
                    border: 'none',
                    background: activeTab === 'palette' ? 'var(--color-bg-secondary)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    color: activeTab === 'palette' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                  }}
                >
                  <Palette size={14} />
                  Palette
                </Tabs.Trigger>
                <Tabs.Trigger 
                  value="wheel"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm)',
                    border: 'none',
                    background: activeTab === 'wheel' ? 'var(--color-bg-secondary)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    color: activeTab === 'wheel' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                  }}
                >
                  <Target size={14} />
                  Wheel
                </Tabs.Trigger>
              </Tabs.List>

              {/* Palette Tab */}
              <Tabs.Content value="palette">
                {/* Preset Colors */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h4 style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Colors
                  </h4>
                  <div className="modern-color-grid">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        className="modern-color-preset"
                        style={{ 
                          backgroundColor: color,
                          border: value === color ? '3px solid var(--color-accent)' : '2px solid var(--color-border-light)'
                        }}
                        onClick={() => handleColorChange(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Recent Colors */}
                {recentColors.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h4 style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      marginBottom: 'var(--spacing-sm)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Recent
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 'var(--spacing-sm)'
                    }}>
                      {recentColors.slice(0, 12).map((color, index) => (
                        <button
                          key={`${color}-${index}`}
                          className="modern-color-preset"
                          style={{ 
                            backgroundColor: color,
                            border: value === color ? '3px solid var(--color-accent)' : '2px solid var(--color-border-light)'
                          }}
                          onClick={() => handleColorChange(color)}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Color Input */}
                <div>
                  <h4 style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Custom
                  </h4>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(e.target.value)}
                    style={{ 
                      width: '100%', 
                      height: '36px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--color-border-light)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </Tabs.Content>

              {/* Color Wheel Tab */}
              <Tabs.Content value="wheel">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ColorWheel
                    value={value}
                    onChange={handleColorChange}
                    size={220}
                  />
                  
                  {/* Current Color Display */}
                  <div style={{ 
                    marginTop: 'var(--spacing-lg)', 
                    textAlign: 'center',
                    width: '100%'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      padding: 'var(--spacing-sm)',
                      background: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: value,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border-light)'
                        }}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const hexValue = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                            handleColorChange(hexValue);
                          }
                        }}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          color: 'var(--color-text-primary)',
                          outline: 'none'
                        }}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>
            
            <Popover.Arrow className="fill-current" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}