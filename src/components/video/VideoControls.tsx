"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, Maximize2, ZoomIn, ZoomOut, Move } from "lucide-react";
import { ClipSettings } from "./types";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  startTime: number;
  endTime: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  // New props for zoom and position controls
  settings?: ClipSettings;
  onSettingsChange?: (updates: Partial<ClipSettings>) => void;
}

export function VideoControls({
  isPlaying,
  currentTime,
  startTime,
  endTime,
  onPlayPause,
  onReset,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  settings,
  onSettingsChange,
}: VideoControlsProps) {
  const duration = endTime - startTime;
  const progress = duration > 0 ? ((currentTime - startTime) / duration) * 100 : 0;

  const handleZoomChange = (value: number[]) => {
    if (onSettingsChange && settings) {
      // Update base settings for non-keyframe periods
      onSettingsChange({ baseZoom: value[0] });
    }
  };

  const handleXPositionChange = (value: number[]) => {
    if (onSettingsChange && settings) {
      // Update base settings for non-keyframe periods
      onSettingsChange({ baseOffsetX: value[0] });
    }
  };

  const handleYPositionChange = (value: number[]) => {
    if (onSettingsChange && settings) {
      // Update base settings for non-keyframe periods
      onSettingsChange({ baseOffsetY: value[0] });
    }
  };

  const resetPosition = () => {
    if (onSettingsChange) {
      onSettingsChange({ 
        baseOffsetX: 50, 
        baseOffsetY: 50, 
        baseZoom: 100,
        xPosition: 50,
        yPosition: 50,
        zoomLevel: 100
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Zoom and Position Controls */}
      {settings && onSettingsChange && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Move className="h-4 w-4" />
            <h4 className="font-medium text-sm">Camera Controls</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={resetPosition}
              className="ml-auto text-xs"
            >
              Reset
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <ZoomIn className="h-3 w-3" />
                Base Zoom: {settings.baseZoom || 100}%
              </label>
              <Slider
                value={[settings.baseZoom || 100]}
                onValueChange={handleZoomChange}
                min={50}
                max={200}
                step={1}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Base X Position: {settings.baseOffsetX || 50}%
              </label>
              <Slider
                value={[settings.baseOffsetX || 50]}
                onValueChange={handleXPositionChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Base Y Position: {settings.baseOffsetY || 50}%
              </label>
              <Slider
                value={[settings.baseOffsetY || 50]}
                onValueChange={handleYPositionChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{Math.floor(currentTime)}s</span>
          <span>{Math.floor(endTime)}s</span>
        </div>
        <Slider
          value={[progress]}
          onValueChange={(value) => onSeek(startTime + (value[0] / 100) * duration)}
          min={0}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPlayPause}
          className="flex-1"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
} 