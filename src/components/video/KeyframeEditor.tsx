"use client";

import { KeyframeSegment } from "./types";

interface KeyframeEditorProps {
    segment: KeyframeSegment;
    onUpdate: (updates: Partial<KeyframeSegment>) => void;
    duration: number;
}

const SliderInput = ({ label, value, onChange, min = 0, max = 100 }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number }) => (
    <div>
        <label className="text-sm font-medium text-gray-400">{label}</label>
        <div className="flex items-center gap-2">
            <input type="range" min={min} max={max} value={value}
                onChange={e => onChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
            <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value, 10))}
                className="w-20 bg-gray-900/50 border border-gray-600 rounded-md p-1 text-center" />
        </div>
    </div>
);

export function KeyframeEditor({ segment, onUpdate, duration }: KeyframeEditorProps) {
    return (
        <div className="space-y-4 p-3 bg-gray-800/80 rounded-lg">
            <h4 className="font-semibold text-white">Editing Segment ({segment.id.substring(0, 4)})</h4>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-400">Start Time (s)</label>
                    <input type="number" value={segment.startTime} max={segment.endTime}
                        onChange={e => onUpdate({ startTime: parseFloat(e.target.value) })}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-md p-1 mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400">End Time (s)</label>
                    <input type="number" value={segment.endTime} min={segment.startTime} max={duration}
                        onChange={e => onUpdate({ endTime: parseFloat(e.target.value) })}
                        className="w-full bg-gray-900/50 border border-gray-600 rounded-md p-1 mt-1" />
                </div>
            </div>

            <div className="space-y-3 p-2 border border-gray-600 rounded-lg">
                <p className="font-semibold text-white">Start Frame</p>
                <SliderInput label="Zoom (%)" value={segment.startZoom} onChange={val => onUpdate({ startZoom: val })} min={100} max={300} />
                <SliderInput label="Position X (%)" value={segment.startOffsetX} onChange={val => onUpdate({ startOffsetX: val })} />
                <SliderInput label="Position Y (%)" value={segment.startOffsetY} onChange={val => onUpdate({ startOffsetY: val })} />
            </div>

            <div className="space-y-3 p-2 border border-gray-600 rounded-lg">
                <p className="font-semibold text-white">End Frame</p>
                <SliderInput label="Zoom (%)" value={segment.endZoom} onChange={val => onUpdate({ endZoom: val })} min={100} max={300} />
                <SliderInput label="Position X (%)" value={segment.endOffsetX} onChange={val => onUpdate({ endOffsetX: val })} />
                <SliderInput label="Position Y (%)" value={segment.endOffsetY} onChange={val => onUpdate({ endOffsetY: val })} />
            </div>
        </div>
    );
}