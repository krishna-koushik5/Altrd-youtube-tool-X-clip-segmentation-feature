import { GoogleGenerativeAI, GenerationConfig, Part, Content, Schema, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Tell Next.js this route must run in a full Node.js runtime (not Edge) so we can use ytdl-core
export const runtime = 'nodejs';

// Define the Pydantic-like models for structured output
interface Caption {
  start: string;
  end: string;
  text: string;
}

// Define the response schema for a list of captions
const CaptionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    start: { type: SchemaType.STRING, description: "The start timestamp of the caption in HH:MM:SS.mmm format." },
    end: { type: SchemaType.STRING, description: "The end timestamp of the caption in HH:MM:SS.mmm format." },
    text: { type: SchemaType.STRING, description: "The transcribed text for the segment." },
  },
  required: ['start', 'end', 'text'],
};

export async function POST(request: NextRequest) {
  try {
    // --- 1. Check for API Key ---
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY environment variable is not set.");
    }

    const body = await request.json();
    const { originalUrl: youtubeUrl, startTime, endTime } = body;

    console.log('Received transcribe request:', { youtubeUrl, startTime, endTime });

    if (!youtubeUrl || startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: youtubeUrl, startTime, endTime' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const systemPrompt = `
      You are an expert video transcriber with perfect timing accuracy. Your task is to extract transcripts for the provided video clip and format them into a structured JSON output.


      The video has already been clipped to the relevant segment. Your only job is to transcribe it with PERFECT timing.


      CRITICAL TIMING REQUIREMENTS:
      1.  The timestamps in your output must start from 00:00:00.000, corresponding to the beginning of the provided clip.
      2.  Listen very carefully to the exact moment each word is spoken in the audio.
      3.  Caption start times should match exactly when the first syllable begins.
      4.  Caption end times should match exactly when the last syllable finishes.
      5.  Generate short captions, with each caption containing exactly 3-4 words for optimal readability.
      6.  Break longer sentences into multiple captions of 3-4 words each.
      7.  Format all timestamps precisely as HH:MM:SS.mmm (including milliseconds to the exact millisecond).
      8.  Ensure perfect synchronization - captions must appear exactly when words are spoken, not even 50ms before or after.
      9.  The clip starts at ${startTime} seconds in the original video, but your timestamps should start from 00:00:00.000.
      10. Do not add any buffer time, delays, or early starts - be precise to the exact millisecond when speech occurs.
      11. If there are pauses in speech, do not extend captions - end them when words stop and start new ones when words resume.
      12. MINIMIZE GAPS BETWEEN CAPTIONS - ensure smooth flow with minimal delays between consecutive captions.
      13. For natural speech flow, overlap captions slightly (by 50-100ms) to prevent gaps where words might be missed.
     
      EXTREMELY IMPORTANT - TIMING CONSISTENCY FOR LONGER CLIPS:
      12. Maintain extremely consistent millisecond-level timing accuracy relative to the provided start time throughout the *entire* clip duration.
      13. Pay close attention to long segments to prevent cumulative drift - timing accuracy at the end of the clip is as critical as timing at the beginning.
      14. For clips longer than 30 seconds, periodically re-verify your timing against the actual audio to prevent accumulated timing errors.
      15. Do not let timing drift occur progressively through the clip - each caption must be independently timed to the actual audio moment.
      16. The final caption's timing must be as precise as the first caption's timing, regardless of clip duration.
     
      AUDIO SYNCHRONIZATION IS CRITICAL - The final video must have perfect lip-sync accuracy.
      Ensure your output is a valid JSON array of caption objects, conforming to the provided schema. Do not add any extra text or explanations.
    `;


    // Use balanced offset to compensate for processing delays - not too early, not too late
    const adjustedStartTime = startTime + 0.08;
    const adjustedEndTime = endTime + 0.08;


    // Extract whole seconds and calculate nanoseconds from fractional part
    const startSeconds = Math.floor(adjustedStartTime);
    const startNanos = Math.round((adjustedStartTime - startSeconds) * 1_000_000_000);
    const endSeconds = Math.floor(adjustedEndTime);
    const endNanos = Math.round((adjustedEndTime - endSeconds) * 1_000_000_000);

    const videoPart: Part = {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: youtubeUrl,
      },
      videoMetadata: {
        startOffset: {
          seconds: startSeconds,
          nanos: startNanos
        },
        endOffset: {
          seconds: endSeconds,
          nanos: endNanos
        }
      }
    } as Part;

    const contents: Content[] = [
      { role: 'user', parts: [videoPart, { text: systemPrompt }] },
    ];

    const generationConfig: GenerationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.ARRAY,
        items: CaptionSchema,
      },
    };

    console.log("Sending request to Gemini API...");
    const result = await model.generateContent({
      contents: contents,
      generationConfig,
    },
      {
        timeout: 300000, // 5 minutes
      });
    console.log("Received response from Gemini API.");

    const response = result.response;

    if (!response || !response.text) {
      throw new Error("Received an empty response from the model.");
    }

    const captions: Caption[] = JSON.parse(response.text());

    // Calculate duration correction factor before adjusting timestamps
    const expectedDuration = endTime - startTime;

    // Calculate total duration of relative captions
    let totalCaptionDuration = 0;
    if (captions.length > 0) {
      const lastCaption = captions[captions.length - 1];
      totalCaptionDuration = timeToSeconds(lastCaption.end);
    }

    // Calculate stretch factor to match expected duration
    const stretchFactor = totalCaptionDuration > 0 ? expectedDuration / totalCaptionDuration : 1;

    // Apply stretch factor to relative timestamps before converting to absolute
    const stretchedCaptions = captions.map(caption => {
      const relativeStart = timeToSeconds(caption.start);
      const relativeEnd = timeToSeconds(caption.end);

      // Apply stretch factor to relative times
      const adjustedRelativeStart = relativeStart * stretchFactor;
      const adjustedRelativeEnd = relativeEnd * stretchFactor;

      return {
        ...caption,
        start: formatTimestamp(adjustedRelativeStart),
        end: formatTimestamp(adjustedRelativeEnd)
      };
    });

    // Adjust captions to be relative to the clip start time for proper synchronization
    const adjustedCaptions = stretchedCaptions.map(caption => ({
      ...caption,
      start: formatTimestamp(timeToSeconds(caption.start) + startTime),
      end: formatTimestamp(timeToSeconds(caption.end) + startTime)
    }));

    console.log(`Generated ${adjustedCaptions.length} captions with adjusted timestamps.`);
    console.log(`Sample timing: First caption starts at ${adjustedCaptions[0]?.start}, clip starts at ${startTime}s`);

    return NextResponse.json({
      success: true,
      captions: adjustedCaptions,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to generate transcription', details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to convert seconds to timestamp format
function timeToSeconds(timeStr: string): number {
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
    console.error(`Error converting time string "${timeStr}" to seconds:`, e);
    return 0;
  }
}

// Helper function to format seconds back to timestamp
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const wholeSeconds = Math.floor(remainingSeconds);
  const milliseconds = Math.round((remainingSeconds - wholeSeconds) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
} 