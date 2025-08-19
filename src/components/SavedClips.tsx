"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { SavedClip } from "@/app/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Save, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { VideoPlayer } from "./video/VideoPlayer";
import { VideoSettings } from "./video/VideoSettings";
import { TextStylingSettings } from "./video/TextStylingSettings";
import { KeyframeTimeline } from "./video/KeyframeTimeline";
import { KeyframeEditor } from "./video/KeyframeEditor";

import { ClipSettings, KeyframeSegment } from "./video/types";
import { formatTime } from "./video/utils";

import { WebhookUrlModal } from "./WebhookUrlModal";
import { getWebhookUrl, saveWebhookUrl } from "@/lib/webhookStore";

// Small UI helper
const SliderInput = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) => (
  <div>
    <label className="text-sm font-medium text-gray-400">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-20 bg-gray-900/50 border border-gray-600 rounded-md p-1 text-center"
      />
    </div>
  </div>
);

interface SavedClipsProps {
  clips: SavedClip[];
  onRemoveClip: (id: string) => void;
  onUpdateClip: (clipId: string, updatedData: Partial<SavedClip>) => void;
  onSwitchToSaveClips?: () => void; // optional tab switch
  onVideoGenerated?: (clipId: string, videoUrl: string) => void; // optional notify
}

export default function SavedClips({
  clips,
  onRemoveClip,
  onUpdateClip,
  onSwitchToSaveClips,
  onVideoGenerated,
}: SavedClipsProps) {
  const [mounted, setMounted] = useState(false);

  // Per-clip settings
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({});

  // Presets
  const [activePreset, setActivePreset] = useState<string>("Custom");

  // List / selection
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showClipsList, setShowClipsList] = useState(true);

  // Transcription editing
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editedTranscription, setEditedTranscription] = useState<string>("");

  // Keyframe editor
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Generate video
  const [generatingClipId, setGeneratingClipId] = useState<string | null>(null);
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<Record<string, string>>({});

  // Webhook: Save All Clips
  const [isSaving, setIsSaving] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);

  // Mount + initialize settings
  useEffect(() => {
    setMounted(true);
    const initial: Record<string, ClipSettings> = {};
    clips.forEach((clip) => {
      if (!clipSettings[clip.id]) {
        initial[clip.id] = getDefaultSettings("9:16"); // default AR; change per clip when needed
      }
    });
    if (Object.keys(initial).length) {
      setClipSettings((prev) => ({ ...prev, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  // Default settings builder
  const getDefaultSettings = (aspectRatio: string = "9:16"): ClipSettings => {
    const canvas = getCanvasDimensions(aspectRatio);
    const padding = 180;
    const elementWidth = canvas.width - padding * 2;

    return {
      // Playback & AR
      aspectRatio: aspectRatio as any,
      isPlaying: false,
      currentTime: 0,

      // Simple camera controls (legacy)
      xPosition: 50,
      yPosition: 50,
      zoomLevel: 100,

      // Keyframes + base camera (advanced)
      keyframes: [],
      baseZoom: 100,
      baseOffsetX: 50,
      baseOffsetY: 50,

      // Titles (generic + 101xFounders)
      topText: "Enter Video Title",
      bottomText: "Enter Credits",
      boldTitleText: "Enter Bold Text",
      regularTitleText: "Enter Regular Text",

      // Title/Credit styling
      topTextColor: "#FFFFFF",
      topTextFontSize: 60,
      bottomTextColor: "#FFFFFF",
      bottomTextFontSize: 50,
      titleFontFamily: "Inter-Medium",
      creditsFontFamily: "Inter-Medium",
      topTextBold: false,
      topTextItalic: false,
      bottomTextBold: false,
      bottomTextItalic: false,

      // Caption styling
      captionColor: "#FFFFFF",
      captionFontSize: 40,
      captionFontFamily: "Roboto-Medium",
      captionBold: false,
      captionItalic: false,
      captionStrokeWidth: 0,
      captionStrokeColor: "#000000",

      // Canvas
      canvasBackgroundColor: "#000000",

      // Manual positions (responsive to AR)
      titlePosition: {
        x: padding,
        y: Math.max(60, canvas.height * 0.05),
        width: elementWidth,
        height: 200,
      },
      captionPosition: {
        x: padding,
        y: canvas.height / 2 - 100,
        width: elementWidth,
        height: 200,
      },
      creditPosition: {
        x: padding,
        y: Math.min(canvas.height - 260, canvas.height * 0.85),
        width: elementWidth,
        height: 200,
      },
    };
  };

  const getCanvasDimensions = (ar: string) => {
    switch (ar) {
      case "16:9":
        return { width: 1920, height: 1080 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "4:5":
        return { width: 1080, height: 1350 };
      case "3:4":
        return { width: 1080, height: 1440 };
      case "9:16":
      default:
        return { width: 1080, height: 1920 };
    }
  };

  // Read settings for a clip or fallback to defaults
  const getSettings = (clipId: string): ClipSettings =>
    clipSettings[clipId] || getDefaultSettings("9:16");

  // Update settings (handles AR changes by resetting default positions)
  const updateSettings = (clipId: string, updates: Partial<ClipSettings>) => {
    setClipSettings((prev) => {
      const current = prev[clipId] || getDefaultSettings("9:16");
      if (updates.aspectRatio && updates.aspectRatio !== current.aspectRatio) {
        const newDefaults = getDefaultSettings(updates.aspectRatio);
        return {
          ...prev,
          [clipId]: {
            ...current,
            ...updates,
            titlePosition: newDefaults.titlePosition,
            captionPosition: newDefaults.captionPosition,
            creditPosition: newDefaults.creditPosition,
          },
        };
      }
      return { ...prev, [clipId]: { ...current, ...updates } };
    });
  };

  // ===== Presets =====
  const applyPresetToAllClips = (preset: string) => {
    setActivePreset(preset);

    let presetSettings: Partial<ClipSettings> = {};

    switch (preset) {
      case "101xFounders":
        presetSettings = {
          titleFontFamily: "Inter-Medium",
          captionFontFamily: "NotoSans-Regular",
          creditsFontFamily: "LibreFranklin-Regular",
          topTextColor: "#F9A21B",
          captionColor: "#FFFFFF",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 2.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "IndianFoundersco":
        presetSettings = {
          titleFontFamily: "NotoSans-Regular",
          captionFontFamily: "NotoSans-Regular",
          creditsFontFamily: "LibreFranklin-Regular",
          topTextColor: "#F2DB2D",
          captionColor: "#FFFFFF",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 5.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "BIP":
        presetSettings = {
          titleFontFamily: "Inter-Medium",
          captionFontFamily: "NotoSans-Regular",
          creditsFontFamily: "NotoSans-Regular",
          topTextColor: "#FFF200",
          captionColor: "#FFFFFF",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 3.5,
          captionStrokeColor: "#000000",
        };
        break;
      case "Lumen Links":
        presetSettings = {
          titleFontFamily: "Inter-Medium",
          captionFontFamily: "Roboto-Medium",
          creditsFontFamily: "LibreFranklin-Regular",
          topTextColor: "#FFFFFF",
          captionColor: "#02D17E",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 2.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "GoodClipsMatter":
        presetSettings = {
          titleFontFamily: "Inter-Medium",
          captionFontFamily: "Roboto-Medium",
          creditsFontFamily: "LibreFranklin-Regular",
          topTextColor: "#FFFFFF",
          captionColor: "#FFFFFF",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 3.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "JabWeWatched":
        presetSettings = {
          titleFontFamily: "NotoSans-Regular",
          captionFontFamily: "Roboto-Medium",
          creditsFontFamily: "LibreFranklin-Regular",
          topTextColor: "#FFFFFF",
          captionColor: "#FFFA00",
          bottomTextColor: "#FFFFFF",
          captionStrokeWidth: 4.0,
          captionStrokeColor: "#000000",
        };
        break;
      default:
        // Custom → no forced change (keep user customizations)
        presetSettings = {};
        break;
    }

    setClipSettings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((cid) => {
        updated[cid] = { ...updated[cid], ...presetSettings };
      });
      return updated;
    });
  };

  // ===== Transcription editing =====
  const handleStartEditing = (clip: SavedClip) => {
    setEditingClipId(clip.id);
    setEditedTranscription(clip.captions?.map((c) => c.text).join(" ") || "");
    // clear any generated video for this clip
    setGeneratedVideoUrls((prev) => {
      const next = { ...prev };
      delete next[clip.id];
      return next;
    });
  };

  const handleSaveTranscription = (clipId: string) => {
    const originalClip = clips.find((c) => c.id === clipId);
    if (!originalClip) return;

    const clipDuration = originalClip.end - originalClip.start;
    const updatedCaptions = [
      {
        start: "00:00:00.000",
        end: formatTime(clipDuration),
        text: editedTranscription,
      },
    ];

    onUpdateClip(clipId, { captions: updatedCaptions });
    setEditingClipId(null);
    toast.success("Transcription updated locally. Generate the video to apply changes.");
  };

  // ===== Keyframes =====
  const addKeyframeSegment = () => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const newSeg: KeyframeSegment = {
      id: uuidv4(),
      startTime: 0,
      endTime: clip.end - clip.start,
      startZoom: 100,
      startOffsetX: 50,
      startOffsetY: 50,
      endZoom: 120,
      endOffsetX: 50,
      endOffsetY: 50,
    };

    updateSettings(selectedClipId, {
      keyframes: [...(getSettings(selectedClipId).keyframes || []), newSeg],
    });
    setSelectedSegmentId(newSeg.id);
  };

  const updateKeyframeSegment = (segmentId: string, updates: Partial<KeyframeSegment>) => {
    if (!selectedClipId) return;
    const current = getSettings(selectedClipId);
    const updated = (current.keyframes || []).map((s) =>
      s.id === segmentId ? { ...s, ...updates } : s
    );
    updateSettings(selectedClipId, { keyframes: updated });
  };

  const removeKeyframeSegment = (segmentId: string) => {
    if (!selectedClipId) return;
    const current = getSettings(selectedClipId);
    const updated = (current.keyframes || []).filter((s) => s.id !== segmentId);
    updateSettings(selectedClipId, { keyframes: updated });
    if (selectedSegmentId === segmentId) setSelectedSegmentId(null);
  };

  // ===== Generate Video =====
  const handleGenerateVideo = async (clip: SavedClip) => {
    setGeneratingClipId(clip.id);
    setGeneratedVideoUrls((prev) => {
      const next = { ...prev };
      delete next[clip.id];
      return next;
    });

    const settings = getSettings(clip.id);

    // Debug log
    console.log("Generating video with settings:", {
      clip: clip.title,
      template: activePreset,
      title: settings.topText,
      credits: settings.bottomText,
      boldTitleText: settings.boldTitleText,
      regularTitleText: settings.regularTitleText,
      fonts: {
        title: settings.titleFontFamily,
        caption: settings.captionFontFamily,
        credits: settings.creditsFontFamily,
      },
      colors: {
        title: settings.topTextColor,
        caption: settings.captionColor,
        credits: settings.bottomTextColor,
      },
      captionCount: clip.captions?.length || 0,
      keyframes: (settings.keyframes || []).length,
      base: {
        zoom: settings.baseZoom,
        x: settings.baseOffsetX,
        y: settings.baseOffsetY,
      },
    });

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: clip.originalUrl,
          videoId: clip.videoId,
          startTime: clip.start,
          endTime: clip.end,
          captions: clip.captions,

          // Template / preset
          template: activePreset === "101xFounders" ? "101xfounders" : activePreset || "default",

          // Canvas / AR
          aspectRatio: settings.aspectRatio,
          canvasBackgroundColor: settings.canvasBackgroundColor,

          // Texts (generic and 101xFounders split)
          title: settings.topText,
          credit: settings.bottomText,
          boldTitleText: settings.boldTitleText,
          regularTitleText: settings.regularTitleText,

          // Title
          titleFontFamily: settings.titleFontFamily,
          titleFontSize: settings.topTextFontSize,
          titleColor: settings.topTextColor,
          titleBold: settings.topTextBold,
          titleItalic: settings.topTextItalic,

          // Credits
          creditFontFamily: settings.creditsFontFamily,
          creditFontSize: settings.bottomTextFontSize,
          creditColor: settings.bottomTextColor,
          creditBold: settings.bottomTextBold,
          creditItalic: settings.bottomTextItalic,

          // Captions
          captionFontFamily: settings.captionFontFamily,
          captionFontSize: settings.captionFontSize,
          captionColor: settings.captionColor,
          captionBold: settings.captionBold,
          captionItalic: settings.captionItalic,
          captionStrokeWidth: settings.captionStrokeWidth,
          captionStrokeColor: settings.captionStrokeColor,

          // Positions
          titlePosition: settings.titlePosition,
          captionPosition: settings.captionPosition,
          creditPosition: settings.creditPosition,

          // Camera (legacy + advanced)
          xPosition: settings.xPosition,
          yPosition: settings.yPosition,
          zoomLevel: settings.zoomLevel,
          baseZoom: settings.baseZoom,
          baseOffsetX: settings.baseOffsetX,
          baseOffsetY: settings.baseOffsetY,
          keyframes: settings.keyframes,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || "Failed to generate video");
      }

      const result = await response.json();

      setGeneratedVideoUrls((prev) => ({ ...prev, [clip.id]: result.videoUrl }));
      onVideoGenerated?.(clip.id, result.videoUrl);

      toast.success("Video generated successfully!", {
        description:
          "Video includes title, captions, credits, keyframes, and preset styling. Switching to Save Clips tab…",
        duration: 3000,
      });

      setTimeout(() => onSwitchToSaveClips?.(), 1000);
    } catch (error) {
      console.error("Video generation error:", error);
      toast.error("Video Generation Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setGeneratingClipId(null);
    }
  };

  // ===== Save All Clips (Webhook) =====
  const openSaveAllClipsModal = () => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }
    setIsWebhookModalOpen(true);
  };

  const handleWebhookSubmit = async (url: string) => {
    saveWebhookUrl("saveAllClips", url);
    await saveAllClipsWithWebhook(url);
  };

  const saveAllClipsWithWebhook = async (webhookUrl: string) => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }

    setIsSaving(true);
    try {
      const clipsPayload = clips.map((clip) => {
        const s = getSettings(clip.id);
        return {
          start: clip.start,
          end: clip.end,
          youtubeURL: clip.originalUrl,
          videoId: clip.videoId,
          title: clip.title,
          aspectRatio: s.aspectRatio || "9:16",
          caption: clip.captions?.map((c) => c.text).join(" ") || "",
          template: activePreset,
          titleColor: s.topTextColor,
          captionFont: s.captionFontFamily,
          keyframes: s.keyframes || [],
        };
      });

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: clipsPayload }),
      });

      if (!res.ok) throw new Error("Failed to save clips");

      toast.success("All clips saved successfully", {
        description: `${clips.length} clips have been saved.`,
      });
    } catch (err) {
      console.error("Error saving clips:", err);
      toast.error("Failed to save clips", {
        description: "Please check the webhook URL and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ===== Derived state =====
  const selectedClip = selectedClipId ? clips.find((c) => c.id === selectedClipId) : null;
  // Get current settings for selected clip
  const currentSettings = selectedClip ? getSettings(selectedClip.id) : null;



  const selectedSegment = currentSettings?.keyframes?.find((s) => s.id === selectedSegmentId) || null;

  // ===== Render =====
  if (!mounted) return null;

  if (clips.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Editor</h2>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
          You haven&apos;t saved any clips yet. Go to the YouTube Clipper tab to create and save clips.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Webhook URL Modal */}
      <WebhookUrlModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onSubmit={handleWebhookSubmit}
        title="Save All Clips Webhook"
        description="Enter the webhook URL to save all clips."
        defaultUrl={getWebhookUrl("saveAllClips")}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Editor</h2>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Select a clip to edit and customize.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowClipsList((v) => !v)}>
            {showClipsList ? "Collapse Clips" : "Expand Clips"}
          </Button>
          <Button onClick={openSaveAllClipsModal} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save All Clips"}
          </Button>
        </div>
      </div>

      {/* Clips Grid */}
      <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#333333]">
        <div className="p-4 border-b border-gray-200 dark:border-[#333333]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Clips ({clips.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Preset:</span>
              <select
                value={activePreset}
                onChange={(e) => applyPresetToAllClips(e.target.value)}
                className="rounded border px-2 py-1 bg-white dark:bg-[#2A2A2A] border-gray-200 dark:border-[#333333]"
              >
                <option value="Custom">Custom</option>
                <option value="101xFounders">101xFounders</option>
                <option value="IndianFoundersco">IndianFoundersco</option>
                <option value="BIP">BIP</option>
                <option value="Lumen Links">Lumen Links</option>
                <option value="GoodClipsMatter">GoodClipsMatter</option>
                <option value="JabWeWatched">JabWeWatched</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClipsList(!showClipsList)}
              >
                {showClipsList ? "Collapse" : "Expand"}
              </Button>
            </div>
          </div>
        </div>

        {showClipsList && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {clips.map((clip) => (
                <Card
                  key={clip.id}
                  onClick={() => {
                    setSelectedClipId(clip.id);
                    setSelectedSegmentId(null);
                    setShowClipsList(false);
                  }}
                  className={`cursor-pointer transition-all bg-white dark:bg-[#2A2A2A] border ${selectedClipId === clip.id
                    ? "border-[#7C3AED] ring-2 ring-[#7C3AED]"
                    : "border-gray-200 dark:border-[#333333] hover:border-[#7C3AED]/50"
                    }`}
                >
                  <CardHeader className="p-0">
                    <Image
                      src={clip.thumbnail}
                      alt={clip.title}
                      width={160}
                      height={90}
                      className="w-full aspect-video object-cover rounded-t-lg"
                    />
                  </CardHeader>
                  <CardContent className="p-3 space-y-1">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {clip.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(clip.start)} - {formatTime(clip.end)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Duration: {formatTime(clip.end - clip.start)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      {selectedClip && currentSettings ? (
        <div className="space-y-6 mt-6">
          {/* Screen 1: Preview, Keyframes & Transcription */}
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#333333] p-6">
            <h3 className="text-xl font-semibold mb-4">Preview, Keyframes & Captions</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Video Player */}
              <div>
                <VideoPlayer
                  clip={selectedClip}
                  settings={currentSettings}
                  onSettingsChange={(updates) => updateSettings(selectedClip.id, updates)}
                />
              </div>

              {/* Middle: Keyframe Timeline & Editor */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Keyframe Timeline</h4>
                <div className="bg-white dark:bg-[#2A2A2A] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                  <KeyframeTimeline
                    segments={currentSettings.keyframes || []}
                    duration={selectedClip.end - selectedClip.start}
                    selectedSegmentId={selectedSegmentId}
                    onSelectSegment={setSelectedSegmentId}
                    onAddSegment={addKeyframeSegment}
                    onRemoveSegment={removeKeyframeSegment}
                  />
                </div>

                {/* Keyframe Editor when segment is selected */}
                {selectedSegment && (
                  <div className="bg-white dark:bg-[#2A2A2A] rounded-lg border border-gray-200 dark:border-[#333333] p-4">
                    <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Edit Keyframe</h5>
                    <KeyframeEditor
                      segment={selectedSegment}
                      onUpdate={(updates) => updateKeyframeSegment(selectedSegment.id, updates)}
                      duration={selectedClip.end - selectedClip.start}
                    />
                  </div>
                )}

                {/* Base Frame Settings */}
                {!selectedSegment && (
                  <div className="p-4 bg-gray-800/80 rounded-lg space-y-3">
                    <h4 className="font-semibold text-white text-sm">Base Frame Settings</h4>
                    <p className="text-xs text-gray-400">
                      This is the default frame. Add segments to create animation.
                    </p>
                    <p className="text-xs text-gray-400">
                      Use the camera controls beside the video player to adjust zoom and position.
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Transcription */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center">
                    <Pencil className="h-4 w-4 mr-2" /> Auto-Generated Transcription
                  </label>
                  <div className="flex gap-2">
                    {editingClipId === selectedClip.id ? (
                      <Button
                        size="sm"
                        onClick={() => handleSaveTranscription(selectedClip.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEditing(selectedClip)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                <div className="h-64 overflow-y-auto p-4 bg-white dark:bg-[#2A2A2A] rounded-lg border border-gray-200 dark:border-[#333333]">
                  {editingClipId === selectedClip.id ? (
                    <textarea
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      className="w-full h-full bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none"
                      autoFocus
                    />
                  ) : selectedClip.captions && selectedClip.captions.length > 0 ? (
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {selectedClip.captions.map((c) => c.text).join(" ")}
                    </p>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No transcription available for this clip.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Screen 2: Settings & Generation */}
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#333333] p-6">
            <h3 className="text-xl font-semibold mb-4">Video Settings & Generation</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Positioning & Layout */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Positioning & Layout</h4>
                  <VideoSettings
                    clipId={selectedClip.id}
                    clip={selectedClip}
                    settings={currentSettings}
                    onSettingsChange={(updates) => updateSettings(selectedClip.id, updates)}
                  />
                </div>

                <div className="space-y-4">
                  {selectedSegment && (
                    <KeyframeEditor
                      segment={selectedSegment}
                      onUpdate={(updates) => updateKeyframeSegment(selectedSegment.id, updates)}
                      duration={selectedClip.end - selectedClip.start}
                    />
                  )}
                </div>
              </div>

              {/* Right: Text styling + Generate */}
              <div className="space-y-6">
                <TextStylingSettings
                  clipId={selectedClip.id}
                  clip={selectedClip}
                  settings={currentSettings}
                  onSettingsChange={(updates) => updateSettings(selectedClip.id, updates)}
                  preset={activePreset}
                  onPresetChange={applyPresetToAllClips}
                />

                <div className="space-y-4">
                  <Button
                    onClick={() => handleGenerateVideo(selectedClip)}
                    disabled={generatingClipId === selectedClip.id}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {generatingClipId === selectedClip.id ? "Generating Video..." : "Generate Video"}
                  </Button>

                  {generatedVideoUrls[selectedClip.id] && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Generated Video:</h4>
                      <video
                        src={generatedVideoUrls[selectedClip.id]}
                        controls
                        className="w-full rounded-lg max-h-64"
                      />
                      <div className="flex gap-2 mt-2">
                        <a
                          href={generatedVideoUrls[selectedClip.id]}
                          download={`clip-${selectedClip.title}.mp4`}
                          className="text-blue-500 hover:underline"
                        >
                          Download Video
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-100 dark:hover:bg-red-900 ml-auto"
                          onClick={() => onRemoveClip(selectedClip.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Clip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Empty state when none selected */}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#1E1E1E] rounded-lg border-2 border-dashed border-gray-300 dark:border-[#333333] mt-6">
          <h3 className="text-xl font-semibold mb-2">Select a Clip to Edit</h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Choose a clip from the list above to start editing and customizing.
          </p>
        </div>
      )}
    </div>
  );
}
