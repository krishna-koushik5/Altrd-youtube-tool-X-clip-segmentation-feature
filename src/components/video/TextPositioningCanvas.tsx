"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ClipSettings } from "./types";
import { SavedClip } from "@/app/page";

interface TextPositioningCanvasProps {
  clip: SavedClip;
  settings: ClipSettings;
  onSettingsChange: (updates: Partial<ClipSettings>) => void;
}

interface DragElement {
  id: string;
  type: 'title' | 'caption' | 'credit';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontSize: number;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const PREVIEW_WIDTH = 270;
const PREVIEW_HEIGHT = 480;
const SNAP_THRESHOLD = 12; // Increased for easier snapping

// Helper function to get aspect ratio dimensions
const getCanvasDimensions = (aspectRatio: string): { width: number; height: number } => {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '4:5':
      return { width: 1080, height: 1350 };
    case '3:4':
      return { width: 1080, height: 1440 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
};

export function TextPositioningCanvas({ clip, settings, onSettingsChange }: TextPositioningCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    elementId: string | null;
    startPos: { x: number; y: number };
    elementStart: { x: number; y: number };
    lastUpdate: number;
  }>({
    isDragging: false,
    elementId: null,
    startPos: { x: 0, y: 0 },
    elementStart: { x: 0, y: 0 },
    lastUpdate: 0,
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [snapIndicator, setSnapIndicator] = useState(false);
  const [isHovering, setIsHovering] = useState<string | null>(null);

  // Local position state for immediate visual feedback during drag
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});

  const canvasDimensions = useMemo(() => getCanvasDimensions(settings.aspectRatio), [settings.aspectRatio]);
  const scaleX = PREVIEW_WIDTH / canvasDimensions.width;
  const scaleY = PREVIEW_HEIGHT / canvasDimensions.height;

  // Throttled settings update to reduce unnecessary re-renders
  const updateSettingsThrottled = useCallback((elementId: string, x: number, y: number) => {
    const now = Date.now();
    if (now - dragRef.current.lastUpdate < 16) return; // 60fps throttle
    dragRef.current.lastUpdate = now;

    const positionKey = `${elementId}Position` as keyof ClipSettings;
    const currentPosition = settings[positionKey] as { x: number; y: number; width: number; height: number };
    
    onSettingsChange({
      [positionKey]: {
        ...currentPosition,
        x: Math.round(x),
        y: Math.round(y),
      }
    });
  }, [settings, onSettingsChange]);

  // Get current positions from settings with proper defaults
  const getCurrentElement = useCallback((id: string): DragElement => {
    // Calculate responsive defaults based on current aspect ratio
    const padding = 180;
    const elementWidth = canvasDimensions.width - (padding * 2);
    
    const getResponsiveDefaults = () => ({
      title: {
        x: padding,
        y: Math.max(60, canvasDimensions.height * 0.05),
        width: elementWidth,
        height: 200,
      },
      caption: {
        x: padding,
        y: canvasDimensions.height / 2 - 100,
        width: elementWidth,
        height: 200,
      },
      credit: {
        x: padding,
        y: Math.min(canvasDimensions.height - 260, canvasDimensions.height * 0.85),
        width: elementWidth,
        height: 200,
      },
    });

    const defaults = getResponsiveDefaults();

    switch (id) {
      case 'title':
        return {
          id: 'title',
          type: 'title',
          x: localPositions.title?.x ?? settings.titlePosition?.x ?? defaults.title.x,
          y: localPositions.title?.y ?? settings.titlePosition?.y ?? defaults.title.y,
          width: settings.titlePosition?.width ?? defaults.title.width,
          height: settings.titlePosition?.height ?? defaults.title.height,
          text: settings.topText || 'Your Amazing Title',
          color: settings.topTextColor || '#f59e0b',
          fontSize: settings.topTextFontSize || 60,
        };
      case 'caption':
        return {
          id: 'caption',
          type: 'caption',
          x: localPositions.caption?.x ?? settings.captionPosition?.x ?? defaults.caption.x,
          y: localPositions.caption?.y ?? settings.captionPosition?.y ?? defaults.caption.y,
          width: settings.captionPosition?.width ?? defaults.caption.width,
          height: settings.captionPosition?.height ?? defaults.caption.height,
          text: 'Caption Text Here',
          color: settings.captionColor || '#ffffff',
          fontSize: settings.captionFontSize || 40,
        };
      case 'credit':
        return {
          id: 'credit',
          type: 'credit',
          x: localPositions.credit?.x ?? settings.creditPosition?.x ?? defaults.credit.x,
          y: localPositions.credit?.y ?? settings.creditPosition?.y ?? defaults.credit.y,
          width: settings.creditPosition?.width ?? defaults.credit.width,
          height: settings.creditPosition?.height ?? defaults.credit.height,
          text: settings.bottomText || '@YourHandle',
          color: settings.bottomTextColor || '#ffffff',
          fontSize: settings.bottomTextFontSize || 40,
        };
      default:
        throw new Error(`Unknown element id: ${id}`);
    }
  }, [settings, localPositions, canvasDimensions]);

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setSelectedElement(elementId);
    setShowGuidelines(true);

    dragRef.current = {
      isDragging: true,
      elementId,
      startPos: { x: e.clientX, y: e.clientY },
      elementStart: {
        x: rect.left - canvasRect.left,
        y: rect.top - canvasRect.top,
      },
      lastUpdate: 0,
    };

    // Add cursor style for better feedback
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.isDragging || !dragRef.current.elementId) return;

    const element = getCurrentElement(dragRef.current.elementId);
    if (!element) return;

    const deltaX = e.clientX - dragRef.current.startPos.x;
    const deltaY = e.clientY - dragRef.current.startPos.y;

    let newX = dragRef.current.elementStart.x + deltaX;
    let newY = dragRef.current.elementStart.y + deltaY;

    // Constrain to canvas with padding
    const padding = 5;
    const elementWidth = element.width * scaleX;
    const elementHeight = element.height * scaleY;
    newX = Math.max(padding, Math.min(newX, PREVIEW_WIDTH - elementWidth - padding));
    newY = Math.max(padding, Math.min(newY, PREVIEW_HEIGHT - elementHeight - padding));

    // Snap to center with magnetic effect
    const elementCenterX = newX + elementWidth / 2;
    const elementCenterY = newY + elementHeight / 2;
    const canvasCenterX = PREVIEW_WIDTH / 2;
    const canvasCenterY = PREVIEW_HEIGHT / 2;

    let snapped = false;
    let snapX = newX;
    let snapY = newY;

    // Horizontal snap with ease-in effect
    const distanceFromCenterX = Math.abs(elementCenterX - canvasCenterX);
    if (distanceFromCenterX < SNAP_THRESHOLD) {
      snapX = canvasCenterX - elementWidth / 2;
      snapped = true;
    } else if (distanceFromCenterX < SNAP_THRESHOLD * 2) {
      // Gradual magnetic pull
      const pullStrength = 1 - (distanceFromCenterX - SNAP_THRESHOLD) / SNAP_THRESHOLD;
      const targetX = canvasCenterX - elementWidth / 2;
      snapX = newX + (targetX - newX) * pullStrength * 0.3;
    }

    // Vertical snap with ease-in effect
    const distanceFromCenterY = Math.abs(elementCenterY - canvasCenterY);
    if (distanceFromCenterY < SNAP_THRESHOLD) {
      snapY = canvasCenterY - elementHeight / 2;
      snapped = true;
    } else if (distanceFromCenterY < SNAP_THRESHOLD * 2) {
      // Gradual magnetic pull
      const pullStrength = 1 - (distanceFromCenterY - SNAP_THRESHOLD) / SNAP_THRESHOLD;
      const targetY = canvasCenterY - elementHeight / 2;
      snapY = newY + (targetY - newY) * pullStrength * 0.3;
    }

    setSnapIndicator(snapped);

    // Convert back to canvas coordinates
    const canvasX = snapX / scaleX;
    const canvasY = snapY / scaleY;

    // Update local position immediately for responsive feedback
    setLocalPositions(prev => ({
      ...prev,
      [dragRef.current.elementId!]: { x: canvasX, y: canvasY }
    }));

    // Throttled settings update
    updateSettingsThrottled(dragRef.current.elementId, canvasX, canvasY);
  }, [getCurrentElement, scaleX, scaleY, updateSettingsThrottled]);

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current.isDragging) return;

    dragRef.current.isDragging = false;
    setShowGuidelines(false);
    setSnapIndicator(false);
    document.body.style.cursor = '';

    // Final position update
    if (dragRef.current.elementId && localPositions[dragRef.current.elementId]) {
      const { x, y } = localPositions[dragRef.current.elementId];
      const positionKey = `${dragRef.current.elementId}Position` as keyof ClipSettings;
      const currentPosition = settings[positionKey] as { x: number; y: number; width: number; height: number };
      
      onSettingsChange({
        [positionKey]: {
          ...currentPosition,
          x: Math.round(x),
          y: Math.round(y),
        }
      });
    }

    // Clear local positions after a delay to allow final update
    setTimeout(() => {
      setLocalPositions({});
    }, 100);

    dragRef.current.elementId = null;
  }, [localPositions, settings, onSettingsChange]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const centerElement = useCallback((elementId: string) => {
    const element = getCurrentElement(elementId);
    if (!element) return;

    const centerX = (canvasDimensions.width - element.width) / 2;
    const centerY = (canvasDimensions.height - element.height) / 2;

    const positionKey = `${elementId}Position` as keyof ClipSettings;
    const currentPosition = settings[positionKey] as { x: number; y: number; width: number; height: number };
    
    onSettingsChange({
      [positionKey]: {
        ...currentPosition,
        x: centerX,
        y: centerY,
      }
    });

    setSnapIndicator(true);
    setTimeout(() => setSnapIndicator(false), 1000);
  }, [getCurrentElement, canvasDimensions, settings, onSettingsChange]);

  // Get current elements for rendering
  const elements = useMemo(() => 
    ['title', 'caption', 'credit'].map(id => getCurrentElement(id)), 
    [getCurrentElement]
  );

  return (
    <div className="text-positioning-canvas">
      <div className="controls mb-4 flex gap-2 justify-center">
        <button
          onClick={() => centerElement('title')}
          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          📍 Center Title
        </button>
        <button
          onClick={() => centerElement('caption')}
          className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          📍 Center Caption
        </button>
        <button
          onClick={() => centerElement('credit')}
          className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          📍 Center Credit
        </button>
      </div>

      <div 
        ref={canvasRef}
        className="canvas-container relative mx-auto border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-900 shadow-lg"
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedElement(null);
          }
        }}
      >
        
        {/* Guidelines with improved visibility */}
        {showGuidelines && (
          <div className="guidelines absolute inset-0 pointer-events-none z-50">
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-green-400 transform -translate-x-1/2 opacity-90 shadow-lg"></div>
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-400 transform -translate-y-1/2 opacity-90 shadow-lg"></div>
          </div>
        )}

        {/* Enhanced snap indicator */}
        {snapIndicator && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-md text-xs font-bold z-50 animate-pulse shadow-lg">
            📍 Snapped to Center!
          </div>
        )}

        {/* Text Elements with enhanced interactions */}
        {elements.map((element) => {
          const previewX = element.x * scaleX;
          const previewY = element.y * scaleY;
          const previewWidth = element.width * scaleX;
          const previewHeight = element.height * scaleY;
          const previewFontSize = Math.max(10, element.fontSize * scaleX / 4);

          const isSelected = selectedElement === element.id;
          const isHovered = isHovering === element.id;
          const isDraggingThis = dragRef.current.isDragging && dragRef.current.elementId === element.id;

          return (
            <div
              key={element.id}
              className={`absolute border-2 border-dashed cursor-grab active:cursor-grabbing flex items-center justify-center text-center font-semibold select-none transition-all duration-150 rounded-md ${
                isSelected 
                  ? 'border-green-400 bg-green-400/20 shadow-lg shadow-green-400/30 scale-105' 
                  : isHovered
                  ? 'border-blue-400 bg-blue-400/15 scale-102'
                  : 'border-blue-400/60 bg-white/10 hover:border-blue-400 hover:bg-white/15'
              } ${isDraggingThis ? 'shadow-2xl z-50 scale-110' : ''}`}
              style={{
                left: previewX,
                top: previewY,
                width: previewWidth,
                height: previewHeight,
                color: element.color,
                fontSize: previewFontSize,
                backdropFilter: 'blur(3px)',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                transform: isDraggingThis ? 'scale(1.1)' : isSelected ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseDown={(e) => handleMouseDown(e, element.id)}
              onMouseEnter={() => setIsHovering(element.id)}
              onMouseLeave={() => setIsHovering(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(element.id);
              }}
            >
              <div className="relative z-10 p-1">
                {element.text}
              </div>
              
              {/* Enhanced resize handle */}
              {isSelected && (
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white cursor-se-resize shadow-lg transition-all duration-200 hover:bg-green-300 hover:scale-110"
                  onMouseDown={(e) => e.stopPropagation()}
                ></div>
              )}
            </div>
          );
        })}

        {/* Canvas background with subtle pattern */}
        <div 
          className="absolute inset-0 -z-10" 
          style={{ 
            backgroundColor: settings.canvasBackgroundColor || '#000000',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        >
        </div>
      </div>

      <div className="status text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
        {selectedElement 
          ? `Selected: ${elements.find(el => el.id === selectedElement)?.text} - Drag to reposition or use center button`
          : 'Click and drag text elements to position them. Hover for preview, drag for smooth positioning.'
        }
      </div>

      <style jsx>{`
        .text-positioning-canvas {
          width: 100%;
        }
        
        .guidelines {
          animation: slideIn 0.2s ease-out;
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .canvas-container {
          transition: box-shadow 0.3s ease;
        }
        
        .canvas-container:hover {
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 