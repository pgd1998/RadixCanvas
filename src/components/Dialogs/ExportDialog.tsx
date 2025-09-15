import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { Download, X, Image, FileCode, Save, Upload } from 'lucide-react';
import type { CanvasObject } from '../../types/objects';
import { 
  exportToPNG, 
  exportToSVG, 
  saveProject, 
  loadProject, 
  downloadBlob,
  type ExportOptions 
} from '../../utils/export';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: { x: number; y: number; zoom: number };
  onProjectLoad?: (objects: CanvasObject[], viewport: { x: number; y: number; zoom: number }) => void;
}

export function ExportDialog({ 
  isOpen, 
  onClose, 
  objects, 
  selectedIds, 
  viewport,
  onProjectLoad 
}: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'png' | 'svg' | 'json'>('png');
  const [exportSelection, setExportSelection] = useState(false);
  const [pngQuality, setPngQuality] = useState(90);
  const [exportScale, setExportScale] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [customDimensions] = useState({ enabled: false, width: 1920, height: 1080 });
  const [projectName, setProjectName] = useState('My Design');
  const [isExporting, setIsExporting] = useState(false);

  const hasSelection = selectedIds.length > 0;
  const objectsToExport = exportSelection && hasSelection 
    ? objects.filter(obj => selectedIds.includes(obj.id))
    : objects;

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: exportFormat,
        quality: pngQuality / 100,
        scale: exportScale,
        exportSelection,
        background: backgroundColor === 'transparent' ? undefined : backgroundColor,
        customDimensions: customDimensions.enabled ? customDimensions : undefined
      };

      let blob: Blob;
      let filename: string;

      switch (exportFormat) {
        case 'png':
          blob = await exportToPNG(objectsToExport, options);
          filename = `${projectName}.png`;
          break;
        case 'svg':
          blob = await exportToSVG(objectsToExport, options);
          filename = `${projectName}.svg`;
          break;
        case 'json':
          blob = await saveProject(objects, viewport, projectName);
          filename = `${projectName}.json`;
          break;
      }

      downloadBlob(blob, filename);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleProjectUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onProjectLoad) return;

    try {
      const projectData = await loadProject(file);
      onProjectLoad(projectData.objects, projectData.viewport);
      setProjectName(projectData.metadata.name);
      onClose();
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project. Please check the file format.');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 'var(--spacing-2xl)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div>
              <Dialog.Title style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Export & Save
              </Dialog.Title>
              <Dialog.Description style={{ 
                fontSize: '14px', 
                color: 'var(--color-text-secondary)',
                margin: '4px 0 0 0'
              }}>
                Export your design or save as project file
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-light)',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}>
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Format Selection */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--color-text-secondary)'
            }}>
              Export Format
            </label>
            <RadioGroup.Root
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as 'png' | 'svg' | 'json')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)'
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--spacing-sm)', 
                  cursor: 'pointer',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color var(--transition-fast)',
                }}
                onClick={() => setExportFormat('png')}
              >
                <RadioGroup.Item
                  value="png"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${exportFormat === 'png' ? 'var(--color-accent)' : 'var(--color-border-medium)'}`,
                    background: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <RadioGroup.Indicator
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      transform: exportFormat === 'png' ? 'scale(1)' : 'scale(0)',
                      transition: 'transform var(--transition-fast)'
                    }}
                  />
                </RadioGroup.Item>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <Image size={16} color="var(--color-text-secondary)" />
                  <span style={{ fontSize: '14px', fontWeight: exportFormat === 'png' ? 500 : 400 }}>PNG (Raster Image)</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--spacing-sm)', 
                  cursor: 'pointer',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color var(--transition-fast)'
                }}
                onClick={() => setExportFormat('svg')}
              >
                <RadioGroup.Item
                  value="svg"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${exportFormat === 'svg' ? 'var(--color-accent)' : 'var(--color-border-medium)'}`,
                    background: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <RadioGroup.Indicator
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      transform: exportFormat === 'svg' ? 'scale(1)' : 'scale(0)',
                      transition: 'transform var(--transition-fast)'
                    }}
                  />
                </RadioGroup.Item>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <FileCode size={16} color="var(--color-text-secondary)" />
                  <span style={{ fontSize: '14px', fontWeight: exportFormat === 'svg' ? 500 : 400 }}>SVG (Vector Graphics)</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--spacing-sm)', 
                  cursor: 'pointer',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color var(--transition-fast)'
                }}
                onClick={() => setExportFormat('json')}
              >
                <RadioGroup.Item
                  value="json"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${exportFormat === 'json' ? 'var(--color-accent)' : 'var(--color-border-medium)'}`,
                    background: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <RadioGroup.Indicator
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      transform: exportFormat === 'json' ? 'scale(1)' : 'scale(0)',
                      transition: 'transform var(--transition-fast)'
                    }}
                  />
                </RadioGroup.Item>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <Save size={16} color="var(--color-text-secondary)" />
                  <span style={{ fontSize: '14px', fontWeight: exportFormat === 'json' ? 500 : 400 }}>JSON (Project File)</span>
                </div>
              </div>
            </RadioGroup.Root>
          </div>

          {/* Project Name */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--color-text-secondary)'
            }}>
              File Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '0 var(--spacing-md)',
                fontSize: '14px',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Enter file name"
            />
          </div>

          {/* Export Options */}
          {exportFormat !== 'json' && (
            <>
              {/* Selection vs All */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={exportSelection}
                    onChange={(e) => setExportSelection(e.target.checked)}
                    disabled={!hasSelection}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    Export selection only {!hasSelection && '(no objects selected)'}
                  </span>
                </label>
              </div>

              {/* Background Color */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: 'var(--spacing-sm)',
                  color: 'var(--color-text-secondary)'
                }}>
                  Background
                </label>
                <select
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 var(--spacing-md)',
                    fontSize: '14px',
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="transparent">Transparent</option>
                  <option value="#ffffff">White</option>
                  <option value="#000000">Black</option>
                  <option value="#f5f5f5">Light Gray</option>
                </select>
              </div>

              {/* PNG Quality */}
              {exportFormat === 'png' && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Quality: {pngQuality}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={pngQuality}
                    onChange={(e) => setPngQuality(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Export Scale */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: 'var(--spacing-sm)',
                  color: 'var(--color-text-secondary)'
                }}>
                  Scale: {exportScale}x
                </label>
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 var(--spacing-md)',
                    fontSize: '14px',
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="0.5">0.5x (Small)</option>
                  <option value="1">1x (Original)</option>
                  <option value="2">2x (High DPI)</option>
                  <option value="3">3x (Ultra High)</option>
                </select>
              </div>
            </>
          )}

          {/* Load Project */}
          {onProjectLoad && (
            <div style={{ 
              marginBottom: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              background: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)'
            }}>
              <h4 style={{ 
                margin: '0 0 var(--spacing-sm) 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}>
                Load Project
              </h4>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm)',
                border: '2px dashed var(--color-border-medium)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}>
                <Upload size={16} color="var(--color-text-secondary)" />
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  Choose JSON project file
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleProjectUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-md)', 
            justifyContent: 'flex-end' 
          }}>
            <Dialog.Close asChild>
              <button style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: isExporting ? 'var(--color-border-medium)' : 'var(--color-accent)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}