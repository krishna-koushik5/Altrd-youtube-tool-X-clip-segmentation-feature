"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipSettings } from "./types";
import { TextPositioningCanvas } from "./TextPositioningCanvas";
import { SavedClip } from "@/app/page";

export interface VideoSettingsProps {
  clipId: string;
  clip: SavedClip;
  settings: ClipSettings;
  onSettingsChange: (updates: Partial<ClipSettings>) => void;
}

export function VideoSettings({ clipId, clip, settings, onSettingsChange }: VideoSettingsProps) {
  // Local state for hex inputs to allow smooth typing
  const [titleColorHex, setTitleColorHex] = useState(settings.topTextColor ?? "#FFFFFF");
  const [creditsColorHex, setCreditsColorHex] = useState(settings.bottomTextColor ?? "#FFFFFF");
  const [captionColorHex, setCaptionColorHex] = useState(settings.captionColor ?? "#FFFFFF");

  // Update local state when settings change (e.g., from color picker)
  useEffect(() => {
    setTitleColorHex(settings.topTextColor ?? "#FFFFFF");
  }, [settings.topTextColor]);

  useEffect(() => {
    setCreditsColorHex(settings.bottomTextColor ?? "#FFFFFF");
  }, [settings.bottomTextColor]);

  useEffect(() => {
    setCaptionColorHex(settings.captionColor ?? "#FFFFFF");
  }, [settings.captionColor]);

  // Helper function to validate and apply hex color
  const applyHexColor = (hexValue: string, settingKey: keyof ClipSettings) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      onSettingsChange({ [settingKey]: hexValue });
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-4">
      {/* Aspect Ratio Selection */}
      <div className="space-y-6">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <span role="img" aria-label="screen">📺</span> Video Aspect Ratio
        </h4>
        
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Aspect Ratio
        </label>
        <Select
            value={settings.aspectRatio ?? "9:16"}
            onValueChange={(value: "9:16" | "16:9" | "1:1" | "4:5" | "3:4") => onSettingsChange({ aspectRatio: value })}
        >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose aspect ratio" />
          </SelectTrigger>
          <SelectContent>
              <SelectItem value="9:16">9:16 (Vertical - Stories, Reels, TikTok)</SelectItem>
              <SelectItem value="16:9">16:9 (Horizontal - YouTube, Landscape)</SelectItem>
              <SelectItem value="1:1">1:1 (Square - Instagram Posts)</SelectItem>
              <SelectItem value="4:5">4:5 (Portrait - Instagram Feed)</SelectItem>
              <SelectItem value="3:4">3:4 (Portrait - LinkedIn, Facebook)</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Manual Text Positioning */}
      <div className="space-y-6">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <span role="img" aria-label="move">🎯</span> Manual Text Positioning
        </h4>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drag and drop text elements to position them exactly where you want. 
            Use center buttons for perfect alignment or drag manually for custom positions.
          </p>
          
          <TextPositioningCanvas
            clip={clip}
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        </div>
      </div>
    </div>
  );
} 