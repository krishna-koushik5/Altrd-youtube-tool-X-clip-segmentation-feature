import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Caption {
  start: string;
  end: string;
  text: string;
}

// Helper function to convert timestamp to seconds
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { captions, startTime, endTime } = body;

    if (!captions || !Array.isArray(captions)) {
      return NextResponse.json({ error: 'No captions provided' }, { status: 400 });
    }

    const clipDuration = endTime - startTime;
    const analysis = {
      clipInfo: {
        startTime,
        endTime,
        duration: clipDuration
      },
      captionAnalysis: captions.map((caption: Caption, index: number) => {
        const absoluteStart = timeToSeconds(caption.start);
        const absoluteEnd = timeToSeconds(caption.end);
        const relativeStart = absoluteStart - startTime;
        const relativeEnd = absoluteEnd - startTime;
        const captionDuration = absoluteEnd - absoluteStart;

        return {
          index: index + 1,
          text: caption.text,
          originalTimestamps: {
            start: caption.start,
            end: caption.end
          },
          absoluteSeconds: {
            start: absoluteStart,
            end: absoluteEnd
          },
          relativeToClip: {
            start: relativeStart,
            end: relativeEnd
          },
          duration: captionDuration,
          issues: {
            startsBeforeClip: relativeStart < 0,
            endsAfterClip: relativeEnd > clipDuration,
            invalidDuration: captionDuration <= 0,
            tooShort: captionDuration < 0.5,
            tooLong: captionDuration > 5
          }
        };
      }),
      summary: {
        totalCaptions: captions.length,
        validCaptions: 0,
        timingIssues: 0,
        averageCaptionDuration: 0,
        captionCoverage: 0
      }
    };

    // Calculate summary stats
    const validCaptions = analysis.captionAnalysis.filter(caption => 
      !Object.values(caption.issues).some(issue => issue)
    );
    
    analysis.summary.validCaptions = validCaptions.length;
    analysis.summary.timingIssues = analysis.captionAnalysis.length - validCaptions.length;
    
    if (validCaptions.length > 0) {
      analysis.summary.averageCaptionDuration = 
        validCaptions.reduce((sum, caption) => sum + caption.duration, 0) / validCaptions.length;
      
      const totalCaptionTime = validCaptions.reduce((sum, caption) => 
        sum + Math.max(0, Math.min(caption.relativeToClip.end, clipDuration) - Math.max(0, caption.relativeToClip.start))
      , 0);
      analysis.summary.captionCoverage = (totalCaptionTime / clipDuration) * 100;
    }

    return NextResponse.json({
      success: true,
      analysis,
      recommendations: generateRecommendations(analysis)
    });

  } catch (error) {
    console.error('Timing analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze timing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(analysis: any): string[] {
  const recommendations = [];
  
  if (analysis.summary.timingIssues > 0) {
    recommendations.push(`${analysis.summary.timingIssues} captions have timing issues that need fixing`);
  }
  
  if (analysis.summary.averageCaptionDuration < 1) {
    recommendations.push('Captions are very short - consider longer duration for better readability');
  }
  
  if (analysis.summary.averageCaptionDuration > 4) {
    recommendations.push('Captions are too long - consider breaking them into shorter segments');
  }
  
  if (analysis.summary.captionCoverage < 50) {
    recommendations.push('Low caption coverage - much of the audio may be uncaptioned');
  }
  
  if (analysis.summary.captionCoverage > 90) {
    recommendations.push('Excellent caption coverage!');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Caption timing looks good!');
  }
  
  return recommendations;
} 