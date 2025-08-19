"use client";

import { KeyframeSegment } from "./types";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { formatTime } from "./utils";

interface KeyframeTimelineProps {
    segments: KeyframeSegment[];
    duration: number;
    selectedSegmentId: string | null;
    onSelectSegment: (id: string | null) => void;
    onAddSegment: () => void;
    onRemoveSegment: (id: string) => void;
}

export function KeyframeTimeline({ segments, duration, selectedSegmentId, onSelectSegment, onAddSegment, onRemoveSegment }: KeyframeTimelineProps) {
    return (
        <div className="space-y-3 p-3 bg-gray-800/80 rounded-lg">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">Keyframe Animation Timeline</h4>
                <Button size="sm" onClick={onAddSegment}><Plus className="h-4 w-4 mr-2" />Add Segment</Button>
            </div>
            <div className="relative w-full h-8 bg-gray-700 rounded-md">
                {segments.map(seg => {
                    const left = (seg.startTime / duration) * 100;
                    const width = ((seg.endTime - seg.startTime) / duration) * 100;
                    return (
                        <div
                            key={seg.id}
                            onClick={() => onSelectSegment(seg.id)}
                            className={`absolute top-0 h-full rounded-md cursor-pointer transition-all ${selectedSegmentId === seg.id ? 'bg-purple-500 ring-2 ring-white' : 'bg-purple-600/70 hover:bg-purple-500'
                                }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`Segment: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`}
                        />
                    );
                })}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {segments.map(seg => (
                    <div key={seg.id} onClick={() => onSelectSegment(seg.id)}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${selectedSegmentId === seg.id ? 'bg-purple-500/30' : 'hover:bg-gray-700/50'
                            }`}
                    >
                        <span className="flex-1 font-mono text-sm text-gray-300">
                            Segment: {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                        </span>
                        <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); onRemoveSegment(seg.id); }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}