import { SavedClip } from "@/app/page";

// Defines the structure for a single animated segment
export interface KeyframeSegment {
  id: string; // A unique ID for the segment
  startTime: number; // Start time in seconds, relative to the clip's start
  endTime: number; // End time in seconds

  // Start keyframe properties
  startZoom: number;    // Zoom level as a percentage (e.g., 100 for no zoom)
  startOffsetX: number; // Horizontal position as a percentage (0=left, 50=center, 100=right)
  startOffsetY: number; // Vertical position as a percentage (0=top, 50=center, 100=bottom)

  // End keyframe properties
  endZoom: number;
  endOffsetX: number;
  endOffsetY: number;
}

// This is the single, unified interface for all clip settings
export interface ClipSettings {
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5" | "3:4";
  isPlaying: boolean;
  currentTime: number;

  // Keyframes for Animation
  keyframes: KeyframeSegment[];

  // Base frame for non-animated parts
  baseZoom: number;
  baseOffsetX: number;
  baseOffsetY: number;

  // Legacy camera controls (for backward compatibility)
  xPosition: number;
  yPosition: number;
  zoomLevel: number;

  // Title / Hook (supports both preset types)
  boldTitleText?: string;       // For "101xFounders" preset
  regularTitleText?: string;    // For "101xFounders" preset
  topText: string;              // For default/custom template

  // Credits
  bottomText: string;

  // All Styling Properties (controlled by presets)
  topTextColor: string;
  topTextFontSize: number;
  titleFontFamily: string;
  topTextBold: boolean;         // Kept for compatibility with styling components
  topTextItalic: boolean;       // Kept for compatibility with styling components

  bottomTextColor: string;
  bottomTextFontSize: number;
  creditsFontFamily: string;
  bottomTextBold: boolean;
  bottomTextItalic: boolean;

  captionColor: string;
  captionFontSize: number;
  captionFontFamily: string;
  captionBold: boolean;
  captionItalic: boolean;
  captionStrokeWidth?: number;
  captionStrokeColor?: string;

  canvasBackgroundColor: string;

  // Static element positions
  titlePosition: { x: number; y: number; width: number; height: number; };
  captionPosition: { x: number; y: number; width: number; height: number; };
  creditPosition: { x: number; y: number; width: number; height: number; };
}

// Declare the comprehensive YouTube API types to be available globally
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLDivElement,
        options: {
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            enablejsapi?: number;
            modestbranding?: number;
            rel?: number;
            showinfo?: number;
            iv_load_policy?: number;
            playsinline?: number;
            mute?: number;
            start?: number;
          };
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: any) => void;
          };
        }
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        playVideo: () => void;
        pauseVideo: () => void;
        getIframe: () => HTMLIFrameElement;
      };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}