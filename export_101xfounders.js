const { spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

// === USER CONFIG ===
const inputPath = 'input.mp4'; // 16:9 input
const outputPath = 'output_101xfounders.mp4';
const headline = 'This is where Zepto went\nfor initial funding'; // Multi-line, centered
const creditText = 'Credit : Nikhil Kamath';
const srtPath = ''; // Optional: path to SRT file

// === FONT SETUP ===
const fontDir = path.resolve(__dirname, 'fonts');
const fontBold = path.join(fontDir, 'Montserrat-Bold.ttf');
const fontRegular = path.join(fontDir, 'Montserrat-Regular.ttf');
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
        }).on('error', () => resolve());
    });
}
async function ensureFonts() {
    await Promise.all(Object.entries(fontUrls).map(([fontPath, url]) => downloadFont(fontPath, url)));
}
function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }

async function main() {
    await ensureFonts();
    if (!fileExists(inputPath)) {
        console.log(`Input video not found: ${inputPath}`);
        return;
    }

    // === LAYOUT CONSTANTS ===
    const canvasW = 1080, canvasH = 1350;
    const videoW = 1080, videoH = 607; // 16:9 scaled to 1080w
    const headerH = 270; // Black bar at top (matches screenshot)
    const footerH = 120; // Black bar at bottom
    const headlineFontSize = 54;
    const creditFontSize = 28;
    const creditMarginX = 40;
    const creditMarginY = 32;

    // === FFmpeg FILTERS ===
    let filter = `
    color=black:s=${canvasW}x${canvasH}:d=1[base];
    [0:v]scale=${videoW}:${videoH}[vid];
    [base][vid]overlay=0:${headerH}[withvid];
    [withvid]drawtext=fontfile='${fontBold}':text='${headline.replace(/'/g, "\'")}':x=(w-text_w)/2:y=${Math.floor(headerH / 2 - headlineFontSize)}:fontsize=${headlineFontSize}:fontcolor=white:borderw=0:line_spacing=10:align=center:alpha=1[withheadline];
    [withheadline]drawtext=fontfile='${fontRegular}':text='${creditText.replace(/'/g, "\'")}':x=${creditMarginX}:y=h-${footerH - creditMarginY}:fontsize=${creditFontSize}:fontcolor=white:borderw=0:alpha=1[withcredit]
  `.replace(/\s+/g, ' ');

    if (srtPath) {
        filter += `;[withcredit]subtitles='${srtPath}':force_style='FontName=Montserrat,FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Alignment=2,MarginV=${footerH + 30}'[final]`;
    } else {
        filter += '[final]';
    }

    const ffmpegArgs = [
        '-y',
        '-i', inputPath,
        '-filter_complex', filter,
        '-map', '[final]',
        '-map', '0:a?',
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

    console.log('Running FFmpeg...');
    const ffmpeg = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
    if (ffmpeg.error) {
        console.log('FFmpeg failed:', ffmpeg.error);
    } else {
        console.log('Video exported to', outputPath);
    }
}

main();
