import React, { useEffect, useRef } from 'react';
import type { CanvasObject } from '../../types/objects';

interface TextInputProps {
  object: CanvasObject;
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  onCancel: () => void;
  viewport: {
    zoom: number;
    x: number;
    y: number;
  };
}

export function TextInput({ 
  object, 
  value, 
  onChange, 
  onComplete, 
  onCancel,
  viewport 
}: TextInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate screen position from world coordinates
  const screenX = (object.bounds.x + object.transform.x) * viewport.zoom + viewport.x;
  const screenY = (object.bounds.y + object.transform.y) * viewport.zoom + viewport.y;
  const screenWidth = object.bounds.width * viewport.zoom;
  const screenHeight = object.bounds.height * viewport.zoom;
  const fontSize = (object.style.fontSize || 16) * viewport.zoom;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onComplete();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onComplete();
  };

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="absolute border-2 border-blue-500 bg-white text-gray-900 resize-none outline-none z-50"
      style={{
        left: screenX,
        top: screenY,
        width: Math.max(screenWidth, 100),
        height: Math.max(screenHeight, 30),
        fontSize: Math.max(fontSize, 12),
        fontFamily: object.style.fontFamily || 'Arial',
        textAlign: object.style.textAlign as any || 'left',
        padding: '2px 4px',
        lineHeight: '1.2'
      }}
    />
  );
}