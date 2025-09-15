import type { CanvasObject } from '../types/objects';

export interface ExportOptions {
  format: 'png' | 'svg' | 'json';
  quality?: number; // 0-1 for PNG
  scale?: number; // Export scale multiplier
  exportSelection?: boolean;
  background?: string;
  customDimensions?: {
    width: number;
    height: number;
  };
}

export interface ProjectData {
  version: string;
  objects: CanvasObject[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {
    name: string;
    created: string;
    modified: string;
  };
}

/**
 * Calculate bounds for a set of objects
 */
function calculateBounds(objects: CanvasObject[]): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  objects.forEach(obj => {
    const left = obj.bounds.x + obj.transform.x;
    const top = obj.bounds.y + obj.transform.y;
    const right = left + obj.bounds.width;
    const bottom = top + obj.bounds.height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  // Add some padding
  const padding = 20;
  return {
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2)
  };
}

/**
 * Render objects to a canvas for PNG export
 */
function renderToCanvas(
  objects: CanvasObject[],
  bounds: { x: number; y: number; width: number; height: number },
  scale: number = 1,
  background?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width * scale;
  canvas.height = bounds.height * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set up high-DPI rendering
  ctx.scale(scale, scale);

  // Fill background if specified
  if (background && background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
  }

  // Sort objects by layer
  const sortedObjects = [...objects].sort((a, b) => a.layer - b.layer);

  // Translate context to account for bounds offset
  ctx.translate(-bounds.x, -bounds.y);

  // Render each object
  sortedObjects.forEach(obj => {
    if (!obj.visible) return;

    ctx.save();
    
    // Apply object transform
    ctx.translate(
      obj.bounds.x + obj.transform.x, 
      obj.bounds.y + obj.transform.y
    );
    ctx.rotate(obj.transform.rotation);
    ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
    
    // Set style
    ctx.globalAlpha = obj.style.opacity;

    // Render based on type
    switch (obj.type) {
      case 'rectangle':
        ctx.beginPath();
        if (obj.style.cornerRadius && obj.style.cornerRadius > 0) {
          // Rounded rectangle
          const radius = Math.min(
            obj.style.cornerRadius,
            obj.bounds.width / 2,
            obj.bounds.height / 2
          );
          const x = 0, y = 0, w = obj.bounds.width, h = obj.bounds.height;
          
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
          ctx.lineTo(x + radius, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
        } else {
          ctx.rect(0, 0, obj.bounds.width, obj.bounds.height);
        }
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill;
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke;
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'circle':
        ctx.beginPath();
        const radiusX = obj.bounds.width / 2;
        const radiusY = obj.bounds.height / 2;
        ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        
        if (obj.style.fill !== 'transparent') {
          ctx.fillStyle = obj.style.fill;
          ctx.fill();
        }
        if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
          ctx.strokeStyle = obj.style.stroke;
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.style.fontSize || 16}px ${obj.style.fontFamily || 'Arial'}`;
          ctx.textAlign = (obj.style.textAlign || 'left') as CanvasTextAlign;
          ctx.textBaseline = 'top';
          
          if (obj.style.fill !== 'transparent') {
            ctx.fillStyle = obj.style.fill;
            ctx.fillText(obj.text, 0, 0);
          }
          if (obj.style.strokeWidth > 0 && obj.style.stroke !== 'transparent') {
            ctx.strokeStyle = obj.style.stroke;
            ctx.lineWidth = obj.style.strokeWidth;
            ctx.strokeText(obj.text, 0, 0);
          }
        }
        break;

      case 'line':
        if (obj.points && obj.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x, obj.points[i].y);
          }
          if (obj.style.strokeWidth > 0) {
            ctx.strokeStyle = obj.style.stroke;
            ctx.lineWidth = obj.style.strokeWidth;
            ctx.stroke();
          }
        }
        break;
    }

    ctx.restore();
  });

  return canvas;
}

/**
 * Generate SVG string from objects
 */
function generateSVG(
  objects: CanvasObject[],
  bounds: { x: number; y: number; width: number; height: number },
  background?: string
): string {
  const sortedObjects = [...objects].sort((a, b) => a.layer - b.layer);
  
  let svgContent = '';
  
  // Add background if specified
  if (background && background !== 'transparent') {
    svgContent += `<rect x="0" y="0" width="${bounds.width}" height="${bounds.height}" fill="${background}"/>`;
  }

  sortedObjects.forEach(obj => {
    if (!obj.visible) return;

    const x = obj.bounds.x + obj.transform.x - bounds.x;
    const y = obj.bounds.y + obj.transform.y - bounds.y;
    
    let transform = '';
    if (obj.transform.rotation !== 0 || obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1) {
      const centerX = x + obj.bounds.width / 2;
      const centerY = y + obj.bounds.height / 2;
      transform = `transform="translate(${centerX},${centerY}) rotate(${obj.transform.rotation * 180 / Math.PI}) scale(${obj.transform.scaleX},${obj.transform.scaleY}) translate(${-centerX},${-centerY})"`;
    }

    switch (obj.type) {
      case 'rectangle':
        if (obj.style.cornerRadius && obj.style.cornerRadius > 0) {
          svgContent += `<rect x="${x}" y="${y}" width="${obj.bounds.width}" height="${obj.bounds.height}" rx="${obj.style.cornerRadius}" ry="${obj.style.cornerRadius}" fill="${obj.style.fill}" stroke="${obj.style.stroke}" stroke-width="${obj.style.strokeWidth}" opacity="${obj.style.opacity}" ${transform}/>`;
        } else {
          svgContent += `<rect x="${x}" y="${y}" width="${obj.bounds.width}" height="${obj.bounds.height}" fill="${obj.style.fill}" stroke="${obj.style.stroke}" stroke-width="${obj.style.strokeWidth}" opacity="${obj.style.opacity}" ${transform}/>`;
        }
        break;

      case 'circle':
        const cx = x + obj.bounds.width / 2;
        const cy = y + obj.bounds.height / 2;
        const rx = obj.bounds.width / 2;
        const ry = obj.bounds.height / 2;
        svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${obj.style.fill}" stroke="${obj.style.stroke}" stroke-width="${obj.style.strokeWidth}" opacity="${obj.style.opacity}" ${transform}/>`;
        break;

      case 'text':
        if (obj.text) {
          svgContent += `<text x="${x}" y="${y + (obj.style.fontSize || 16)}" font-family="${obj.style.fontFamily || 'Arial'}" font-size="${obj.style.fontSize || 16}" fill="${obj.style.fill}" stroke="${obj.style.stroke}" stroke-width="${obj.style.strokeWidth}" opacity="${obj.style.opacity}" text-anchor="${obj.style.textAlign === 'center' ? 'middle' : obj.style.textAlign === 'right' ? 'end' : 'start'}" ${transform}>${obj.text}</text>`;
        }
        break;

      case 'line':
        if (obj.points && obj.points.length > 1) {
          const points = obj.points.map(p => `${x + p.x},${y + p.y}`).join(' ');
          svgContent += `<polyline points="${points}" fill="none" stroke="${obj.style.stroke}" stroke-width="${obj.style.strokeWidth}" opacity="${obj.style.opacity}" ${transform}/>`;
        }
        break;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">
${svgContent}
</svg>`;
}

/**
 * Export objects as PNG
 */
export function exportToPNG(
  objects: CanvasObject[],
  options: ExportOptions = { format: 'png' }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const bounds = options.customDimensions 
        ? { x: 0, y: 0, ...options.customDimensions }
        : calculateBounds(objects);
      
      const scale = options.scale || 1;
      const canvas = renderToCanvas(objects, bounds, scale, options.background);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png', options.quality || 0.9);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export objects as SVG
 */
export function exportToSVG(
  objects: CanvasObject[],
  options: ExportOptions = { format: 'svg' }
): Promise<Blob> {
  return new Promise((resolve) => {
    const bounds = options.customDimensions 
      ? { x: 0, y: 0, ...options.customDimensions }
      : calculateBounds(objects);
    
    const svgString = generateSVG(objects, bounds, options.background);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    resolve(blob);
  });
}

/**
 * Save project as JSON
 */
export function saveProject(
  objects: CanvasObject[],
  viewport: { x: number; y: number; zoom: number },
  name: string = 'Untitled Project'
): Promise<Blob> {
  return new Promise((resolve) => {
    const projectData: ProjectData = {
      version: '1.0.0',
      objects,
      viewport,
      metadata: {
        name,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
    
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    resolve(blob);
  });
}

/**
 * Load project from JSON
 */
export function loadProject(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const projectData = JSON.parse(jsonString) as ProjectData;
        
        // Validate project data structure
        if (!projectData.objects || !projectData.viewport) {
          throw new Error('Invalid project file format');
        }
        
        resolve(projectData);
      } catch (error) {
        reject(new Error('Failed to parse project file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read project file'));
    reader.readAsText(file);
  });
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}