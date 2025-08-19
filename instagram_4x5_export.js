const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

// === CONFIGURABLE VARIABLES ===
const inputPath = 'input.mp4'; // Path to your 16:9 input video
const outputPath = 'output_instagram_4x5.mp4'; // Path for the output video
const headlineLeft = 'Airtel ex-CEO'; // Bold orange part
const headlineRight = 'on India’s digital future'; // Regular white part
const creditText = 'Credit: EV Powering India'; // Bottom-left credit
const srtPath = ''; // Optional: path to SRT file, leave '' if not used

// === FONT SETTINGS ===
const fontDir = path.resolve(__dirname, 'fonts');
const fontBold = path.join(fontDir, 'Montserrat-Bold.ttf'); // Or Roboto-Bold.ttf
const fontRegular = path.join(fontDir, 'Montserrat-Regular.ttf'); // Or Roboto-Regular.ttf

// === FONT DOWNLOAD URLS ===
const fontUrls = {
    [fontBold]: 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf',
    [fontRegular]: 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Regular.ttf',
};

function downloadFont(fontPath, url) {
    return new Promise((resolve) => {
        if (fs.existsSync(fontPath)) return resolve();
        if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });
        const file = fs.createWriteStream(fontPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', () => resolve()); // Ignore errors, just resolve
    });
}

async function ensureFonts() {
    await Promise.all(Object.entries(fontUrls).map(([fontPath, url]) => downloadFont(fontPath, url)));
}

function fileExists(p) {
    try { return fs.existsSync(p); } catch { return false; }
}

// === FFmpeg FILTERS ===

// 1. Scale and pad video to 1080x1350, centered
const videoFilter = `
  [0:v]scale=${videoW}:-2,pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[bgvid]
`.replace(/\s+/g, '');

// 2. Draw headline (two parts, one bold orange, one regular white, both centered)
const headlineFilter = `
  [bgvid]drawtext=fontfile='${fontBold}':text='${headlineLeft}':x=(w-text_w)/2:y=${marginTop}:fontsize=${headlineFontSize}:fontcolor=#FF9900:borderw=0:expansion=none:alpha=1,
  drawtext=fontfile='${fontRegular}':text=' ${headlineRight}':x=(w+tw)/2:y=${marginTop}:fontsize=${headlineFontSize}:fontcolor=white:borderw=0:expansion=none:alpha=1[with_headline]
`.replace(/\s+/g, '');

// 3. Draw credits at bottom-left
const creditFilter = `
  [with_headline]drawtext=fontfile='${fontRegular}':text='${creditText}':x=${marginX}:y=h-${marginBottom}:fontsize=${creditFontSize}:fontcolor=white:borderw=0:alpha=1[with_credits]
`.replace(/\s+/g, '');

// 4. Subtitles (if provided)
const subtitleFilter = srtPath
    ? `;[with_credits]subtitles='${srtPath}':force_style='FontName=Montserrat,FontSize=44,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Alignment=2,MarginV=120'[final]`
    : '[with_credits][final]';

// === COMBINE FILTERS ===
const filterComplex = [
    videoFilter,
    headlineFilter,
    creditFilter
].join(';') + (srtPath
    ? `;[with_credits]subtitles='${srtPath}':force_style='FontName=Montserrat,FontSize=44,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Alignment=2,MarginV=120'[final]`
    : '[with_credits]null[final]');

// === FFmpeg COMMAND ===
const ffmpegArgs = [
    '-y',
    '-i', inputPath,
    '-filter_complex', filterComplex,
    '-map', '[final]',
    '-map', '0:a?', // include audio if present
    '-c:v', 'libx264',
    '-crf', '20',
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-metadata:s:v:0', 'rotate=0',
    '-c:a', 'aac',
    '-shortest',
    outputPath
];


async function main() {
    // Download fonts if missing
    await ensureFonts();

    // Check input video
    if (!fileExists(inputPath)) {
        console.log(`Input video not found: ${inputPath}`);
        return;
    }

    console.log('Running FFmpeg with arguments:\n', ffmpegArgs.join(' '));
    const ffmpeg = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
    if (ffmpeg.error) {
        console.log('FFmpeg failed:', ffmpeg.error);
    } else {
        console.log('Video exported to', outputPath);
    }
}

main();
