"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SavedClip } from "@/app/page";

interface CaptionTimingDebuggerProps {
  clip: SavedClip;
}

interface TimingAnalysis {
  captionIndex: number;
  text: string;
  originalStart: string;
  originalEnd: string;
  relativeStart: number;
  relativeEnd: number;
  duration: number;
  issues: string[];
}

export function CaptionTimingDebugger({ clip }: CaptionTimingDebuggerProps) {
  const [analysis, setAnalysis] = useState<TimingAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const timeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    try {
      const parts = timeStr.split(':');
      const secondsParts = parts[parts.length - 1].split('.');
      const hours = parts.length > 2 ? parseInt(parts[0], 10) : 0;
      const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2], 10) : 0;
      const seconds = parseInt(secondsParts[0], 10);
      const milliseconds = secondsParts.length > 1 ? parseInt(secondsParts[1].padEnd(3, '0'), 10) : 0;

      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    } catch (e) {
      return 0;
    }
  };

  const analyzeTimings = async () => {
    if (!clip.captions || clip.captions.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const clipDuration = clip.end - clip.start;
      const analysisResults: TimingAnalysis[] = clip.captions.map((caption, index) => {
        const absoluteStart = timeToSeconds(caption.start);
        const absoluteEnd = timeToSeconds(caption.end);
        const relativeStart = absoluteStart - clip.start;
        const relativeEnd = absoluteEnd - clip.start;
        const duration = absoluteEnd - absoluteStart;

        const issues: string[] = [];
        
        if (relativeStart < 0) {
          issues.push('Starts before clip begins');
        }
        if (relativeEnd > clipDuration) {
          issues.push('Ends after clip ends');
        }
        if (duration <= 0) {
          issues.push('Invalid duration');
        }
        if (duration < 0.5) {
          issues.push('Very short duration (<0.5s)');
        }
        if (duration > 5) {
          issues.push('Very long duration (>5s)');
        }

        return {
          captionIndex: index + 1,
          text: caption.text,
          originalStart: caption.start,
          originalEnd: caption.end,
          relativeStart,
          relativeEnd,
          duration,
          issues
        };
      });

      setAnalysis(analysisResults);
    } catch (error) {
      console.error('Failed to analyze caption timing:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatSeconds = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <Card className="p-4 mt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Caption Timing Analysis</h3>
          <Button onClick={analyzeTimings} disabled={isAnalyzing || !clip.captions?.length}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Timing'}
          </Button>
        </div>

        {clip.captions && clip.captions.length === 0 && (
          <p className="text-gray-500">No captions available for analysis</p>
        )}

        {analysis.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-sm font-medium border-b pb-2">
              <span>#</span>
              <span>Text</span>
              <span>Start (rel)</span>
              <span>End (rel)</span>
              <span>Duration</span>
              <span>Issues</span>
            </div>
            
            {analysis.map((item) => (
              <div 
                key={item.captionIndex} 
                className={`grid grid-cols-6 gap-2 text-sm py-2 border-b ${
                  item.issues.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <span>{item.captionIndex}</span>
                <span className="truncate" title={item.text}>{item.text}</span>
                <span>{formatSeconds(item.relativeStart)}</span>
                <span>{formatSeconds(item.relativeEnd)}</span>
                <span>{item.duration.toFixed(2)}s</span>
                <span className={`text-xs ${item.issues.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.issues.length > 0 ? item.issues.join(', ') : 'OK'}
                </span>
              </div>
            ))}
            
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>Clip Duration: {formatSeconds(clip.end - clip.start)}</p>
              <p>Total Captions: {analysis.length}</p>
              <p>Issues Found: {analysis.filter(a => a.issues.length > 0).length}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 