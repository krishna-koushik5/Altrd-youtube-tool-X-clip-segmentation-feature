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
import { SavedClip } from "@/app/page";

export interface TextStylingSettingsProps {
  clipId: string;
  clip: SavedClip;
  settings: ClipSettings;
  onSettingsChange: (updates: Partial<ClipSettings>) => void;
  preset: string; // required
  onPresetChange: (preset: string) => void; // required
}

const sanitizeTextInput = (text: string, placeholder: string): string => {
  if (text.includes(placeholder)) {
    return "";
  }
  return text;
};

export function TextStylingSettings({
  clipId,
  clip,
  settings,
  onSettingsChange,
  preset,
  onPresetChange,
}: TextStylingSettingsProps) {
  // Local state for hex inputs
  const [titleColorHex, setTitleColorHex] = useState(
    settings.topTextColor ?? "#FFFFFF"
  );
  const [creditsColorHex, setCreditsColorHex] = useState(
    settings.bottomTextColor ?? "#FFFFFF"
  );
  const [captionColorHex, setCaptionColorHex] = useState(
    settings.captionColor ?? "#FFFFFF"
  );

  useEffect(() => {
    setTitleColorHex(settings.topTextColor ?? "#FFFFFF");
  }, [settings.topTextColor]);

  useEffect(() => {
    setCreditsColorHex(settings.bottomTextColor ?? "#FFFFFF");
  }, [settings.bottomTextColor]);

  useEffect(() => {
    setCaptionColorHex(settings.captionColor ?? "#FFFFFF");
  }, [settings.captionColor]);

  const applyHexColor = (hexValue: string, settingKey: keyof ClipSettings) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      onSettingsChange({ [settingKey]: hexValue });
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6 p-3 bg-gray-800/80 rounded-lg">
      <div>
        <h4 className="font-semibold flex items-center gap-2 text-white text-lg mb-4">
          Text Styling & Presets
        </h4>
        <div className="mb-4">
          <label className="font-medium text-gray-300">Style Preset</label>
          <Select value={preset} onValueChange={onPresetChange}>
            <SelectTrigger className="w-full bg-gray-900/50 border-gray-600">
              <SelectValue placeholder="Choose a style preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="101xFounders">101xFounders</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
              <SelectItem value="IndianFoundersco">IndianFoundersco</SelectItem>
              <SelectItem value="BIP">BIP</SelectItem>
              <SelectItem value="Lumen Links">Lumen Links</SelectItem>
              <SelectItem value="GoodClipsMatter">GoodClipsMatter</SelectItem>
              <SelectItem value="JabWeWatched">JabWeWatched</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Titles */}
      {preset === "101xFounders" ? (
        <div className="space-y-4">
          {/* Bold Title */}
          <div>
            <label className="text-sm font-medium text-gray-400">
              Bold Title (Orange)
            </label>
            <input
              type="text"
              value={settings.boldTitleText ?? ""}
              onChange={(e) =>
                onSettingsChange({
                  boldTitleText: sanitizeTextInput(
                    e.target.value,
                    "Enter Bold Text"
                  ),
                })
              }
              placeholder="Enter bold text"
              className="w-full bg-gray-900/50 border-gray-600 rounded-md p-2 mt-1"
            />
          </div>
          {/* Regular Title */}
          <div>
            <label className="text-sm font-medium text-gray-400">
              Regular Title (White)
            </label>
            <input
              type="text"
              value={settings.regularTitleText ?? ""}
              onChange={(e) =>
                onSettingsChange({
                  regularTitleText: sanitizeTextInput(
                    e.target.value,
                    "Enter Regular Text"
                  ),
                })
              }
              placeholder="Enter regular text"
              className="w-full bg-gray-900/50 border-gray-600 rounded-md p-2 mt-1"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-gray-400">Video Title</label>
          <input
            type="text"
            value={settings.topText ?? ""}
            onChange={(e) =>
              onSettingsChange({
                topText: sanitizeTextInput(e.target.value, "Enter Video Title"),
              })
            }
            placeholder="Enter Video Title"
            className="w-full bg-gray-900/50 border-gray-600 rounded-md p-2 mt-1"
          />
        </div>
      )}

      {/* Credits */}
      <div>
        <label className="text-sm font-medium text-gray-400">Video Credits</label>
        <input
          type="text"
          value={settings.bottomText ?? ""}
          onChange={(e) =>
            onSettingsChange({
              bottomText: sanitizeTextInput(e.target.value, "Enter Credits"),
            })
          }
          placeholder="Enter Credits"
          className="w-full bg-gray-900/50 border-gray-600 rounded-md p-2 mt-1"
        />
      </div>

      {/* Colors */}
      {preset === "101xFounders" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-400">
              Bold Title Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded border border-gray-600"
                style={{ backgroundColor: "#F9A21B" }}
              />
              <span className="text-xs font-mono text-gray-400">#F9A21B</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400">
              Regular Title Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded border border-gray-600"
                style={{ backgroundColor: "#FFFFFF" }}
              />
              <span className="text-xs font-mono text-gray-400">#FFFFFF</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Title Color */}
          <div>
            <label className="text-sm font-medium text-gray-400">
              Video Title Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-10 h-10 p-0 border-none rounded"
                value={settings.topTextColor ?? "#FFFFFF"}
                onChange={(e) => onSettingsChange({ topTextColor: e.target.value })}
              />
              <input
                type="text"
                className="w-20 rounded-md border border-gray-600 bg-transparent px-2 py-1 text-xs font-mono"
                value={titleColorHex}
                onChange={(e) => {
                  const hexValue = e.target.value;
                  setTitleColorHex(hexValue);
                  applyHexColor(hexValue, "topTextColor");
                }}
                onBlur={() => {
                  if (!applyHexColor(titleColorHex, "topTextColor")) {
                    setTitleColorHex(settings.topTextColor ?? "#FFFFFF");
                  }
                }}
                placeholder="#FFFFFF"
                maxLength={7}
              />
            </div>
          </div>
          {/* Credits Color */}
          <div>
            <label className="text-sm font-medium text-gray-400">
              Video Credits Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-10 h-10 p-0 border-none rounded"
                value={settings.bottomTextColor ?? "#FFFFFF"}
                onChange={(e) =>
                  onSettingsChange({ bottomTextColor: e.target.value })
                }
              />
              <input
                type="text"
                className="w-20 rounded-md border border-gray-600 bg-transparent px-2 py-1 text-xs font-mono"
                value={creditsColorHex}
                onChange={(e) => {
                  const hexValue = e.target.value;
                  setCreditsColorHex(hexValue);
                  applyHexColor(hexValue, "bottomTextColor");
                }}
                onBlur={() => {
                  if (!applyHexColor(creditsColorHex, "bottomTextColor")) {
                    setCreditsColorHex(settings.bottomTextColor ?? "#FFFFFF");
                  }
                }}
                placeholder="#FFFFFF"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}

      {/* Font Sizes + Bold/Italic */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top */}
        <div>
          <label className="text-sm font-medium text-gray-400">
            Video Title Font Size
          </label>
          <input
            type="number"
            className="w-24 bg-gray-900/50 border border-gray-600 rounded-md p-2 text-sm"
            value={settings.topTextFontSize ?? 60}
            onChange={(e) =>
              onSettingsChange({
                topTextFontSize: parseInt(e.target.value || "0", 10),
              })
            }
          />
        </div>
        {/* Bottom */}
        <div>
          <label className="text-sm font-medium text-gray-400">
            Video Credits Font Size
          </label>
          <input
            type="number"
            className="w-24 bg-gray-900/50 border border-gray-600 rounded-md p-2 text-sm"
            value={settings.bottomTextFontSize ?? 50}
            onChange={(e) =>
              onSettingsChange({
                bottomTextFontSize: parseInt(e.target.value || "0", 10),
              })
            }
          />
        </div>
      </div>

      {/* Caption Styling */}
      <div className="pt-4 border-t border-gray-700 space-y-2">
        <label className="text-sm font-medium text-gray-400">
          Burned-In Caption Styling
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400">Caption Color</label>
            <input
              type="color"
              className="w-10 h-10 p-0 border-none rounded"
              value={settings.captionColor ?? "#FFFFFF"}
              onChange={(e) => onSettingsChange({ captionColor: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400">
              Caption Font Size
            </label>
            <input
              type="number"
              className="w-24 bg-gray-900/50 border border-gray-600 rounded-md p-2 text-sm"
              value={settings.captionFontSize ?? 48}
              onChange={(e) =>
                onSettingsChange({
                  captionFontSize: parseInt(e.target.value || "0", 10),
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Font Families */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-400">
            Video Title Font
          </label>
          <Select
            value={settings.titleFontFamily ?? "Inter-Medium"}
            onValueChange={(value: string) =>
              onSettingsChange({ titleFontFamily: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="LibreFranklin-Regular">
                Libre Franklin
              </SelectItem>
              <SelectItem value="Manrope-Medium">Manrope Medium</SelectItem>
              <SelectItem value="Poppins-Regular">Poppins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-400">Caption Font</label>
          <Select
            value={settings.captionFontFamily ?? "Roboto-Medium"}
            onValueChange={(value: string) =>
              onSettingsChange({ captionFontFamily: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="LibreFranklin-Regular">
                Libre Franklin
              </SelectItem>
              <SelectItem value="TrebuchetMS-Italic">Trebuchet MS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-400">
            Video Credits Font
          </label>
          <Select
            value={settings.creditsFontFamily ?? "Inter-Medium"}
            onValueChange={(value: string) =>
              onSettingsChange({ creditsFontFamily: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="Poppins-Regular">Poppins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
