import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ColorWheelProps {
  value: string;
  onChange: (color: string) => void;
  size?: number;
}

// Helper functions for color conversion
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  
  let r, g, b;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  
  return [h, s, v];
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function ColorWheel({ value, onChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentHsv, setCurrentHsv] = useState<[number, number, number]>([0, 1, 1]);

  // Convert current hex value to HSV
  useEffect(() => {
    const [r, g, b] = hexToRgb(value);
    const hsv = rgbToHsv(r, g, b);
    setCurrentHsv(hsv);
  }, [value]);

  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI + 180;
          const saturation = distance / radius;
          const [r, g, b] = hsvToRgb(angle, saturation, currentHsv[2]);
          
          const index = (y * size + x) * 4;
          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw current position indicator
    const currentAngle = (currentHsv[0] - 180) * Math.PI / 180;
    const currentDistance = currentHsv[1] * radius;
    const indicatorX = centerX + currentDistance * Math.cos(currentAngle);
    const indicatorY = centerY + currentDistance * Math.sin(currentAngle);

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = value;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw outer ring
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }, [size, currentHsv, value]);

  useEffect(() => {
    drawColorWheel();
  }, [drawColorWheel]);

  const getColorFromPosition = (x: number, y: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return value;

    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = size / 2 - 10;
    
    if (distance <= radius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 180;
      const saturation = Math.min(distance / radius, 1);
      const [r, g, b] = hsvToRgb(angle, saturation, currentHsv[2]);
      return rgbToHex(r, g, b);
    }
    
    return value;
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    const newColor = getColorFromPosition(event.clientX, event.clientY);
    if (newColor !== value) {
      onChange(newColor);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      const newColor = getColorFromPosition(event.clientX, event.clientY);
      if (newColor !== value) {
        onChange(newColor);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="color-wheel-container" style={{ display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ 
          cursor: isDragging ? 'grabbing' : 'crosshair',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-md)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* Value (Brightness) Slider */}
      <div style={{ marginTop: 'var(--spacing-lg)', width: '100%' }}>
        <label style={{ 
          display: 'block',
          fontSize: '13px', 
          fontWeight: 500, 
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--color-text-secondary)' 
        }}>
          Brightness
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={currentHsv[2]}
          onChange={(e) => {
            const newV = parseFloat(e.target.value);
            const [r, g, b] = hsvToRgb(currentHsv[0], currentHsv[1], newV);
            onChange(rgbToHex(r, g, b));
          }}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: `linear-gradient(to right, 
              ${rgbToHex(...hsvToRgb(currentHsv[0], currentHsv[1], 0))}, 
              ${rgbToHex(...hsvToRgb(currentHsv[0], currentHsv[1], 1))})`,
            outline: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
}