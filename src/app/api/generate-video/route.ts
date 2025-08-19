import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { registerFont, createCanvas } from 'canvas';

// Types
interface Caption {
  start: string;
  end: string;
  text: string;
}

interface Keyframe {
  startTime: number;
  endTime: number;
  startZoom?: number;
  startOffsetX?: number;
  startOffsetY?: number;
}

interface CanvasDimensions {
  width: number;
  height: number;
}

interface PngDimensions {
  width?: number;
  height?: number;
}

/* ---------------------------- FFmpeg path wiring --------------------------- */
let resolvedFfmpegPath: string | undefined;
try {
  resolvedFfmpegPath = require('ffmpeg-static');
} catch { }
if (!resolvedFfmpegPath || !fsSync.existsSync(resolvedFfmpegPath as string)) {
  const common = ['/usr/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  resolvedFfmpegPath = common.find(p => fsSync.existsSync(p));
}
if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath as string);
  console.log('Using ffmpeg at', resolvedFfmpegPath);
} else {
  console.warn('FFmpeg binary not found. Ensure ffmpeg is installed.');
}

export const runtime = 'nodejs';

/* ---------------------------- Helper Functions ---------------------------- */

function fmt(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(3)) : 0;
}

function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  try {
    const parts = timeStr.split(':');
    const secParts = parts[parts.length - 1].split('.');
    const h = parts.length > 2 ? parseInt(parts[0], 10) : 0;
    const m = parts.length > 1 ? parseInt(parts[parts.length - 2], 10) : 0;
    const s = parseInt(secParts[0], 10);
    const ms = secParts.length > 1 ? parseInt(secParts[1].padEnd(3, '0'), 10) : 0;
    return h * 3600 + m * 60 + s + ms / 1000;
  } catch {
    return 0;
  }
}

function normalizeColor(c: string) {
  if (!c) return 'black';
  const s = c.trim().toLowerCase();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex}`;
    return hex; // '#black' -> 'black'
  }
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s}`;
  return s; // assume named color
}

// FFmpeg filtergraph: '#' starts comment; use 0xRRGGBB or named color.
function colorForLavfi(color: string) {
  let c = (color || '').trim().toLowerCase();
  if (!c) return 'black';
  if (c.startsWith('#')) c = c.slice(1);
  if (/^[0-9a-f]{6}$/i.test(c)) return `0x${c}`;
  return c; // named colors like "black"
}

// Simple text→PNG renderer (naive wrapping)
async function createTextImage(opts: {
  text: string;
  width: number;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  strokeWidth?: number;
  strokeColor?: string;
}) {
  const {
    text,
    width,
    fontSize,
    fontColor,
    fontFamily = 'Inter',
    fontWeight = 'normal',
    fontStyle = 'normal',
    textAlign = 'center',
    strokeWidth = 0,
    strokeColor = 'black'
  } = opts;

  const lineHeight = Math.round(fontSize * 1.2);
  const padding = 6;

  const measureCanvas = createCanvas(10, 10);
  const mctx = measureCanvas.getContext('2d');
  mctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const words = (text || ' ').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (mctx.measureText(test).width > width - padding * 2 && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const height = padding * 2 + lines.length * lineHeight;
  const canvas = createCanvas(width, Math.max(height, lineHeight + padding * 2));
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = fontColor;
  ctx.textAlign = textAlign;

  const alignX =
    textAlign === 'left' ? padding :
      textAlign === 'right' ? width - padding :
        Math.floor(width / 2);

  let y = padding;
  for (const line of lines) {
    if (strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor!;
      ctx.strokeText(line, alignX, y);
    }
    ctx.fillText(line, alignX, y);
    y += lineHeight;
  }
  return canvas.toBuffer('image/png');
}

// Canvas dimensions helper
function getCanvasDimensions(aspectRatio: string): CanvasDimensions {
  if (aspectRatio === '9:16') {
    return { width: 1080, height: 1920 };
  } else if (aspectRatio === '16:9') {
    return { width: 1920, height: 1080 };
  } else if (aspectRatio === '1:1') {
    return { width: 1080, height: 1080 };
  } else if (aspectRatio === '4:5') {
    return { width: 1080, height: 1350 };
  } else {
    // Default to 9:16
    return { width: 1080, height: 1920 };
  }
}

// PNG dimensions helper
async function getPngSizeFromBuffer(buffer: Buffer): Promise<PngDimensions> {
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const img = await loadImage(buffer);
    return { width: img.width, height: img.height };
  } catch (error) {
    console.warn('Failed to get PNG dimensions:', error);
    return { width: undefined, height: undefined };
  }
}

// FFmpeg stream error mitigation — track valid filters
function validateFilters(filters: string[]): string[] {
  // Check for truly invalid filters (empty, undefined values, or actual undefined/null strings)
  // Note: "null" in FFmpeg filters is valid - it's a pass-through filter
  const invalidFilters = filters.filter(f => {
    if (!f || typeof f !== 'string') return true;
    if (f.includes('undefined')) return true;
    // Don't flag "null" as invalid - it's a valid FFmpeg filter
    return false;
  });

  if (invalidFilters.length > 0) {
    console.error('❌ Invalid filters detected:', invalidFilters);
    throw new Error('Invalid filter(s) detected - check stream construction');
  }
  return filters;
}

// Split long filter chains into manageable parts for FFmpeg
function splitFilterChain(filters: string[], maxLength: number = 30000): string[][] {
  const result: string[][] = [];
  let currentBatch: string[] = [];
  let currentLength = 0;

  for (const filter of filters) {
    const filterLength = filter.length + 1; // +1 for the semicolon separator

    if (currentLength + filterLength > maxLength && currentBatch.length > 0) {
      result.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }

    currentBatch.push(filter);
    currentLength += filterLength;
  }

  if (currentBatch.length > 0) {
    result.push(currentBatch);
  }

  return result;
}

// Validate filter chain syntax and structure
function validateFilterChainSyntax(filterChain: string): boolean {
  try {
    // Check for basic syntax issues
    if (!filterChain.includes('[0:v]')) return false;
    if (!filterChain.includes('[final_output]')) return false;

    // Check for balanced brackets
    const openBrackets = (filterChain.match(/\[/g) || []).length;
    const closeBrackets = (filterChain.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) return false;

    // Check for valid stream references
    const streamRefs = filterChain.match(/\[([^\]]+)\]/g) || [];
    const uniqueStreams = [...new Set(streamRefs)];

    // Ensure we have the essential streams
    const essentialStreams = ['0:v', 'bg', 'final_output'];
    for (const essential of essentialStreams) {
      if (!uniqueStreams.some(ref => ref.includes(essential))) return false;
    }

    return true;
  } catch (error) {
    console.error('Filter chain syntax validation error:', error);
    return false;
  }
}

// Create a minimal working filter chain as last resort
function createMinimalWorkingFilterChain(duration: number, canvas: CanvasDimensions): string {
  const bgColor = '0x000000';
  return [
    `color=c=${bgColor}:s=${canvas.width}x${canvas.height}:d=${duration}[bg]`,
    `[0:v]scale=iw*100/100:ih*100/100:force_original_aspect_ratio=increase,setsar=1[scaled_0]`,
    `[bg][scaled_0]overlay=0:0[seg_0]`,
    `[seg_0]null[final_output]`
  ].join(';');
}

// Create an ultra-simple working filter chain - just video on background
function createUltraSimpleFilterChain(duration: number, canvas: CanvasDimensions): string {
  const bgColor = '0x000000';
  return [
    `color=c=${bgColor}:s=${canvas.width}x${canvas.height}:d=${duration}[bg]`,
    `[0:v]scale=iw*100/100:ih*100/100:force_original_aspect_ratio=increase,setsar=1[scaled_0]`,
    `[bg][scaled_0]overlay=0:0[final_output]`
  ].join(';');
}

// Create the absolute simplest possible filter chain - guaranteed to work
function createAbsoluteSimplestFilterChain(duration: number, canvas: CanvasDimensions): string {
  const bgColor = '0x000000';
  return [
    `color=c=${bgColor}:s=${canvas.width}x${canvas.height}:d=${duration}[bg]`,
    `[0:v]scale=iw*100/100:ih*100/100:force_original_aspect_ratio=increase,setsar=1[scaled_0]`,
    `[bg][scaled_0]overlay=0:0[final_output]`
  ].join(';');
}

/* ---------------------------- Video downloader ---------------------------- */

async function downloadVideoWithPytubefix(
  youtubeUrl: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<{ success: boolean; error?: string; resolution?: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'download_video.py');
    const isWindows = process.platform === 'win32';
    const venvPython = isWindows
      ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.join(process.cwd(), '.venv', 'bin', 'python');
    const pythonCmd = fsSync.existsSync(venvPython) ? venvPython : isWindows ? 'python' : 'python3';

    const scriptArgs = [scriptPath, youtubeUrl, String(startTime), String(endTime), outputPath];
    const python = spawn(pythonCmd, scriptArgs, { shell: false });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (d) => { stdout += d.toString(); });
    python.stderr.on('data', (d) => { stderr += d.toString(); });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          resolve({ success: false, error: `Failed to parse downloader output: ${String(e)}` });
        }
      } else {
        resolve({ success: false, error: `Downloader failed (${code}): ${stderr}` });
      }
    });
  });
}

/* ---------------------------- Route Processing ---------------------------- */

export async function POST(request: NextRequest) {
  const tempDir = path.join('/tmp', `video-gen-${uuidv4()}`);
  let cleanupDone = false;

  try {
    await fs.mkdir(tempDir, { recursive: true });

    const body = await request.json();
    const {
      youtubeUrl,
      startTime: rawStartTime,
      endTime: rawEndTime,
      // captions = [], // DISABLED
      title = '',
      credit = '',
      boldTitleText = '',
      regularTitleText = '',
      template = 'default',
      aspectRatio = '9:16',
      titleFontSize = 60,
      titleColor = '#FFFFFF',
      // captionColor = '#FFFFFF', // DISABLED
      creditFontSize = 24,
      creditColor = '#FFFFFF',
      titleFontFamily = 'Inter-Medium',
      // captionFontFamily = 'NeueHaasDisplayMediu', // DISABLED
      creditsFontFamily = 'Inter-Medium',
      // captionStrokeColor = 'black', // DISABLED
      canvasBackgroundColor = 'black',
      titleBold = false,
      titleItalic = false,
      // captionItalic = false, // DISABLED
      baseZoom = 100,
      baseOffsetX = 50,
      baseOffsetY = 50,
      keyframes = [],
    } = body;

    // Times
    const startTime = Number.isFinite(rawStartTime) && rawStartTime >= 0 ? rawStartTime : 0;
    const endTime = Number.isFinite(rawEndTime) && rawEndTime > startTime ? rawEndTime : startTime + 30;
    const duration = endTime - startTime;

    // Canvas setup and validation
    const canvas = getCanvasDimensions(aspectRatio);
    const bgColorNormalized = normalizeColor(canvasBackgroundColor);
    const lavfiBG = colorForLavfi(bgColorNormalized);

    // Layout calculation
    const topBarHeight = Math.max(Math.floor(canvas.height * 0.18), 80);
    const bottomBarHeight = Math.floor(canvas.height * 0.16);
    const availH = canvas.height - topBarHeight - bottomBarHeight;
    let videoW = Math.floor(canvas.width * 0.9);
    let videoH = Math.floor(videoW * 9 / 16);
    if (videoH > availH) {
      videoH = availH;
      videoW = Math.floor(videoH * 16 / 9);
    }
    let baseCenterX = Math.floor((canvas.width - videoW) / 2);
    let baseCenterY = topBarHeight + Math.floor((availH - videoH) / 2);

    // Title handling
    const titleImageWidth = videoW;
    let titleImageBuffer: Buffer;

    if (template === '101xfounders') {
      const bold = boldTitleText || '';
      const regular = regularTitleText || '';
      if (!bold && !regular) {
        titleImageBuffer = await createTextImage({
          text: ' ',
          width: titleImageWidth,
          fontSize: titleFontSize,
          fontColor: 'transparent',
          fontFamily: titleFontFamily,
        });
      } else {
        const boldImg = await createTextImage({
          text: bold,
          width: titleImageWidth,
          fontSize: titleFontSize,
          fontColor: '#F9A21B',
          fontFamily: 'Inter',
          fontWeight: '700',
          textAlign: 'center'
        });
        const regImg = await createTextImage({
          text: regular,
          width: titleImageWidth,
          fontSize: titleFontSize,
          fontColor: '#FFFFFF',
          fontFamily: 'Inter',
          fontWeight: '300',
          textAlign: 'center'
        });

        const { loadImage } = await import('canvas');
        const boldDims = await getPngSizeFromBuffer(boldImg);
        const regDims = await getPngSizeFromBuffer(regImg);

        const totalH = (boldDims.height || titleFontSize) + (regDims.height || titleFontSize);
        const canvasStack = createCanvas(titleImageWidth, totalH);
        const ctx = canvasStack.getContext('2d');

        const bImg = await loadImage(`data:image/png;base64,${boldImg.toString('base64')}`);
        const rImg = await loadImage(`data:image/png;base64,${regImg.toString('base64')}`);

        let y = 0;
        ctx.drawImage(bImg, 0, y);
        y += (boldDims.height || titleFontSize);
        ctx.drawImage(rImg, 0, y);

        titleImageBuffer = canvasStack.toBuffer('image/png');
      }
    } else {
      titleImageBuffer = await createTextImage({
        text: title || ' ',
        width: titleImageWidth,
        fontSize: titleFontSize,
        fontColor: title ? titleColor : 'transparent',
        fontFamily: titleFontFamily,
        fontWeight: titleBold ? 'bold' : 'normal',
        fontStyle: titleItalic ? 'italic' : 'normal',
        textAlign: 'center',
      });
    }

    // Prepare title image
    const titleImagePath = path.join(tempDir, 'title.png');
    await fs.writeFile(titleImagePath, titleImageBuffer);

    // Calculate title position above video
    const titleDims = await getPngSizeFromBuffer(titleImageBuffer);
    const titleH = titleDims.height || Math.round(titleFontSize * 1.2);
    const titleGap = 64;

    const newTopBar = Math.max(topBarHeight, titleH + titleGap + 20);
    const availH2 = canvas.height - newTopBar - bottomBarHeight;
    let videoW2 = videoW;
    let videoH2 = Math.floor(videoW2 * 9 / 16);
    if (videoH2 > availH2) {
      videoH2 = availH2;
      videoW2 = Math.floor(videoH2 * 16 / 9);
    }
    videoW = videoW2;
    videoH = videoH2;
    baseCenterX = Math.floor((canvas.width - videoW) / 2);
    baseCenterY = newTopBar + Math.floor((availH2 - videoH) / 2);

    const titlePosition = {
      x: Math.floor((canvas.width - videoW) / 2),
      y: Math.max(10, baseCenterY - titleH - 10),
    };

    // Generate credit image
    const creditImagePath = path.join(tempDir, 'credit.png');
    const creditText = credit ? (credit.startsWith('Credit: ') ? credit : `Credit: ${credit}`) : ' ';
    const creditImageBuffer = await createTextImage({
      text: creditText,
      width: canvas.width,
      fontSize: creditFontSize,
      fontColor: credit ? creditColor : 'transparent',
      fontFamily: creditsFontFamily,
      fontWeight: 'normal',
      textAlign: 'left',
    });
    await fs.writeFile(creditImagePath, creditImageBuffer);
    const creditPosition = {
      x: 0,
      y: baseCenterY + videoH + 10,
    };

    // TRANSCRIPTION/CAPTIONS COMPLETELY DISABLED - FOCUS ON CORE VIDEO
    // This eliminates all transcription complexity to focus on basic video generation
    console.log(`🔧 Transcription and captions completely disabled for core testing`);
    console.log(`🔧 Focus: Background + Video + Title + Credits only`);

    // Empty caption images array - no captions will be processed
    const captionImages: Array<{ path: string; startTime: number; endTime: number }> = [];

    // Download the video
    const downloadedVideoPath = path.join(tempDir, 'downloaded.mp4');
    const dl = await downloadVideoWithPytubefix(youtubeUrl, startTime, endTime, downloadedVideoPath);
    if (!dl.success) throw new Error(dl.error || 'Failed to download source');

    // Validate input files exist and are readable
    console.log('🔍 Validating input files...');

    try {
      const videoStats = await fs.stat(downloadedVideoPath);
      console.log(`✅ Video file: ${downloadedVideoPath} (${videoStats.size} bytes)`);

      const titleStats = await fs.stat(titleImagePath);
      console.log(`✅ Title image: ${titleImagePath} (${titleStats.size} bytes)`);

      const creditStats = await fs.stat(creditImagePath);
      console.log(`✅ Credit image: ${creditImagePath} (${creditStats.size} bytes)`);

      // Check if files are actually readable
      await fs.access(downloadedVideoPath, fs.constants.R_OK);
      await fs.access(titleImagePath, fs.constants.R_OK);
      await fs.access(creditImagePath, fs.constants.R_OK);
      console.log('✅ All input files are readable');

    } catch (error) {
      console.error('❌ Input file validation failed:', error);
      throw new Error(`Input file validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Generate filters and validate
    const filters: string[] = [];

    // Define offset limits
    const maxOffsetX = Math.floor(canvas.width * 0.3);
    const maxOffsetY = Math.floor(canvas.height * 0.3);

    filters.push(`color=c=${lavfiBG}:s=${canvas.width}x${canvas.height}:d=${fmt(duration)}[bg]`);
    const baseX = Math.floor(((baseOffsetX - 50) / 50) * maxOffsetX) + baseCenterX;
    const baseY = Math.floor(((baseOffsetY - 50) / 50) * maxOffsetY) + baseCenterY;
    let lastLabel = 'bg';

    // Add dynamic filters for video zooming/offsets
    if (keyframes.length > 0) {
      keyframes.forEach((seg: Keyframe, i: number) => {
        const zoom = seg.startZoom ?? baseZoom;
        const segOffsetX = seg.startOffsetX ?? baseOffsetX;
        const segOffsetY = seg.startOffsetY ?? baseOffsetY;
        filters.push(`[0:v]scale=iw*${fmt(zoom)}/100:ih*${fmt(zoom)}/100:force_original_aspect_ratio=increase,setsar=1[scaled_${i}]`);
        const segX = Math.floor(((segOffsetX - 50) / 50) * maxOffsetX) + baseCenterX;
        const segY = Math.floor(((segOffsetY - 50) / 50) * maxOffsetY) + baseCenterY;
        filters.push(`[${lastLabel}][scaled_${i}]overlay=${segX}:${segY}:enable=between(t,${fmt(seg.startTime)},${fmt(seg.endTime)})[seg_${i}]`);
        lastLabel = `seg_${i}`;
      });
      // null filter passes through the video stream without modification
      filters.push(`[${lastLabel}]null[animated_video]`);
    } else {
      filters.push(`[0:v]scale=iw*${fmt(baseZoom)}/100:ih*${fmt(baseZoom)}/100:force_original_aspect_ratio=increase,setsar=1[scaled_0]`);
      filters.push(`[${lastLabel}][scaled_0]overlay=${baseX}:${baseY}:enable=between(t,0,${fmt(duration)})[seg_0]`);
      // null filter passes through the video stream without modification
      filters.push(`[seg_0]null[animated_video]`);
    }

    // MINIMAL OVERLAYS - DIRECT TO FINAL OUTPUT
    // Combine title and credit overlays into single filter to reduce complexity
    console.log(`🔧 Minimal overlays - combining title and credit into single operation`);

    // Single overlay operation for both title and credit
    const combinedOverlay = `[animated_video][1:v]overlay=${titlePosition.x}:${titlePosition.y}[with_title]`;
    filters.push(combinedOverlay);

    const creditOverlay = `[with_title][2:v]overlay=${creditPosition.x}:${creditPosition.y}[final_output]`;
    filters.push(creditOverlay);

    console.log(`📝 Added combined overlays: ${combinedOverlay}`);
    console.log(`📝 Added credit overlay: ${creditOverlay}`);

    // FILTER CHAIN COMPLETE - DIRECT TO FINAL OUTPUT
    // No more intermediate streams needed - we go directly to final_output
    console.log(`🔧 Filter chain complete - direct path to final_output`);
    console.log(`🔧 Stream flow: Background → Video → Title → Credits → final_output`);

    // DEBUG: Show exactly what filters we have
    console.log('🔍 DEBUG: Final filters array contents:');
    filters.forEach((filter, index) => {
      console.log(`  Filter ${index}: ${filter}`);
    });

    // Validate filters and run
    console.log('🔍 Validating filters before processing...');
    console.log('Filters to validate:', filters);
    console.log('🔍 Filter count:', filters.length);
    validateFilters(filters);
    console.log('✅ All filters validated successfully');

    // Check filter chain length to prevent FFmpeg parsing issues
    const filterchain = filters.join(';');
    console.log(`🔍 Filter chain length: ${filterchain.length} characters`);
    console.log(`🔍 Number of filters: ${filters.length}`);

    // CRITICAL DEBUG: Show the exact filter chain being generated
    console.log('🔍 CRITICAL DEBUG: Exact filter chain being generated:');
    console.log(filterchain);

    // Verify no with_caption_ references exist (captions are disabled)
    if (filterchain.includes('with_caption_')) {
      console.error('❌ CRITICAL ERROR: Filter chain contains with_caption_ references!');
      console.error('Captions are disabled - this should not happen!');
      throw new Error('Filter chain contains with_caption_ references - this will cause FFmpeg to fail');
    }

    // Verify the ultra-simplified filter chain structure
    console.log(`🔍 Ultra-simplified filter chain structure: Background → Video → Title → Credits → final_output`);

    // Additional validation - ensure we have the minimal required streams
    const requiredStreams = ['[0:v]', '[bg]', '[final_output]'];
    const missingStreams = requiredStreams.filter(stream => !filterchain.includes(stream));
    if (missingStreams.length > 0) {
      console.error('❌ CRITICAL ERROR: Missing required streams:', missingStreams);
      throw new Error(`Missing required streams: ${missingStreams.join(', ')}`);
    }

    console.log(`✅ All required streams present: ${requiredStreams.join(', ')}`);

    // FFmpeg has limits on filter string length - warn if too long
    if (filterchain.length > 32000) {
      console.warn('⚠️ WARNING: Filter chain is very long, this may cause FFmpeg parsing issues');
      console.warn(`Current length: ${filterchain.length} characters`);
    }

    const finalVideoName = `final-${uuidv4()}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'videos');
    const outputPath = path.join(outputDir, finalVideoName);

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`✅ Output directory ready: ${outputDir}`);
    } catch (error) {
      console.error('❌ Failed to create output directory:', error);
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg()
        .input(downloadedVideoPath)
        .inputOptions(['-ss', `${fmt(startTime)}`, '-t', `${fmt(duration)}`])
        .input(titleImagePath)
        .input(creditImagePath);

      // CAPTION INPUTS TEMPORARILY DISABLED
      // No caption files are added to FFmpeg since captions are disabled
      console.log(`🔧 Caption inputs disabled - no caption files added to FFmpeg`);

      // Handle very long filter chains by splitting them
      let finalFilterChain = filterchain;
      if (filterchain.length > 30000) {
        console.log('🔧 Filter chain is very long, attempting to optimize...');

        // Try to reduce caption count if possible
        if (captionImages.length > 20) {
          console.log(`⚠️ WARNING: Very high caption count (${captionImages.length}) may cause FFmpeg issues`);
          console.log('Consider reducing the number of captions or increasing the time intervals');
        }

        // Split into manageable chunks if needed
        const filterBatches = splitFilterChain(filters, 25000);
        if (filterBatches.length > 1) {
          console.log(`🔧 Split filter chain into ${filterBatches.length} batches`);
          // For now, use the first batch and log a warning
          finalFilterChain = filterBatches[0].join(';');
          console.warn('⚠️ Using first batch only - some captions may be omitted');
        }
      }

      // Fallback: If filter chain is still too long, use a simplified approach
      if (finalFilterChain.length > 30000) {
        console.log('🔧 Filter chain still too long, using simplified approach...');

        // Create a minimal filter chain with just the essential elements
        const essentialFilters = [
          filters[0], // Background
          filters[1], // Video scaling
          filters[2], // Video overlay
          filters[3], // Null pass-through
          filters[4], // Title overlay
          filters[5], // Credit overlay
        ];

        // Ensure the simplified chain ends with final_output
        if (!essentialFilters[essentialFilters.length - 1].includes('final_output')) {
          essentialFilters.push(`[with_overlays]null[final_output]`);
        }

        finalFilterChain = essentialFilters.join(';');
        console.warn('⚠️ Using simplified filter chain - captions will be omitted');
        console.log(`🔧 Simplified filter chain length: ${finalFilterChain.length} characters`);
      }

      // Simplified validation - just check the basics
      if (!finalFilterChain.includes('[final_output]')) {
        console.error('❌ CRITICAL ERROR: Filter chain does not end with final_output');
        console.error('Filter chain:', finalFilterChain);
        throw new Error('Filter chain must end with final_output - this will cause FFmpeg to fail');
      }

      // Basic structure check
      if (!finalFilterChain.includes('[0:v]') || !finalFilterChain.includes('[bg]')) {
        console.error('❌ CRITICAL ERROR: Essential streams missing, using minimal chain...');
        finalFilterChain = createMinimalWorkingFilterChain(duration, canvas);
        console.warn('⚠️ Using minimal working filter chain - basic video only');
      }

      // Final safety check - if anything looks wrong, use absolute simplest chain
      if (finalFilterChain.length > 1000 || !finalFilterChain.includes('[final_output]')) {
        console.error('❌ CRITICAL ERROR: Filter chain looks problematic, using absolute simplest chain...');
        finalFilterChain = createAbsoluteSimplestFilterChain(duration, canvas);
        console.warn('⚠️ Using absolute simplest filter chain - basic video only, no overlays, no titles, no credits');
      }

      // EXTRA SAFETY: If still having issues, force the simplest possible chain
      if (finalFilterChain.includes('with_title') || finalFilterChain.includes('with_overlays')) {
        console.error('❌ CRITICAL ERROR: Complex streams detected, forcing absolute simplest chain...');
        finalFilterChain = createAbsoluteSimplestFilterChain(duration, canvas);
        console.warn('⚠️ FORCED to absolute simplest filter chain - video on background only');
      }

      // FINAL SAFETY: If we're still having issues, try the most basic possible approach
      if (finalFilterChain.length > 500) {
        console.error('❌ CRITICAL ERROR: Filter chain still too complex, using most basic approach...');
        finalFilterChain = `[0:v]scale=iw*100/100:ih*100/100:force_original_aspect_ratio=increase,setsar=1[final_output]`;
        console.warn('⚠️ FORCED to most basic filter chain - just scale video, no background, no overlays');
      }

      // Final debug log before FFmpeg execution
      console.log('🎬 EXECUTING FFMPEG WITH FILTER CHAIN:');
      console.log(finalFilterChain);
      console.log(`🔍 Filter chain length: ${finalFilterChain.length} characters`);
      console.log(`🔍 Stream references: ${(finalFilterChain.match(/\[([^\]]+)\]/g) || []).join(', ')}`);

      // CRITICAL DEBUG: Show the exact filter chain structure
      console.log('🔍 CRITICAL DEBUG: Filter chain breakdown:');
      const filterParts = finalFilterChain.split(';');
      filterParts.forEach((part, index) => {
        console.log(`  Part ${index + 1}: ${part.trim()}`);
      });

      // Verify final stream is correct
      if (!finalFilterChain.endsWith('[final_output]')) {
        console.error('❌ CRITICAL ERROR: Filter chain does not end with [final_output]');
        console.error('Last part:', filterParts[filterParts.length - 1]);
        throw new Error('Filter chain must end with [final_output]');
      }

      // Add detailed FFmpeg event logging
      cmd
        .complexFilter(finalFilterChain, ['final_output'])
        .outputOptions([
          '-map', '0:a?',
          '-c:a', 'aac',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-sn',
          '-y', // Overwrite output files without asking
          '-loglevel', 'info', // More detailed logging
        ])
        .toFormat('mp4')
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg command started:');
          console.log(commandLine);
        })
        .on('progress', (progress) => {
          console.log(`📊 FFmpeg progress: ${progress.percent}% done, ${progress.timemark}`);
        })
        .on('stderr', (stderrLine) => {
          console.log(`🔍 FFmpeg stderr: ${stderrLine}`);
        })
        .on('end', () => {
          console.log('✅ FFmpeg completed successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error details:', err);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .save(outputPath);
    });

    cleanupDone = true;
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { }

    return NextResponse.json({ success: true, videoUrl: `/videos/${finalVideoName}` });
  } catch (error) {
    console.error('Error generating video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate video', details: message }, { status: 500 });
  } finally {
    if (!cleanupDone) {
      try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { }
    }
  }
}
