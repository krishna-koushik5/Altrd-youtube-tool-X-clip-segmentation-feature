
import { promises as fs } from 'fs';
import path from 'path';

// This map contains the specific names Google Fonts API uses.
// Updated to use fonts that download successfully
const fontApiMap: Record<string, string> = {
  // Original fonts
  'Inter-Medium': 'Inter:wght@500',
  'Roboto-Medium': 'Roboto:wght@500',
  'LibreFranklin-Regular': 'Libre Franklin:wght@400',
  'NotoSans-Regular': 'Noto Sans:wght@400',
  
  // Brand-specific fonts with Google Fonts fallbacks
  'Manrope-Bold': 'Manrope:wght@700',
  'Manrope-Medium': 'Manrope:wght@500',
  'Poppins-Regular': 'Poppins:wght@400',
  'Onest-Medium': 'Inter:wght@500', // Onest not available, use Inter
  'TrebuchetMS-Italic': 'Roboto:wght@500', // Trebuchet MS fallback to Roboto
  'Spectral-Bold': 'Spectral:wght@700',
  'ArticulatCF-Bold': 'Inter:wght@700', // Articulat CF not available, use Inter
  'NeueHaasGrotesk-Medium': 'Inter:wght@500', // Neue Haas Grotesk not available, use Inter
  'FranklinGothic-Book': 'Libre Franklin:wght@400', // Franklin Gothic fallback
  'Ebrima-Regular': 'Noto Sans:wght@400', // Ebrima fallback
};

// Fallback system fonts for macOS
const systemFontPaths: Record<string, string[]> = {
  'Roboto-Medium': [
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux fallback
  ],
  'Poppins-Regular': [
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ],
  'Manrope-Bold': [
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ],
};

const fontDir = path.join(process.cwd(), 'public', 'fonts');

/**
 * Copies a system font as a fallback
 */
async function copySystemFont(fontName: string): Promise<string> {
  const fallbackPaths = systemFontPaths[fontName] || systemFontPaths['Roboto-Medium'];
  
  for (const systemPath of fallbackPaths) {
    try {
      await fs.access(systemPath);
      const fontFileName = `${fontName}.ttf`;
      const targetPath = path.join(fontDir, fontFileName);
      
      await fs.copyFile(systemPath, targetPath);
      console.log(`Copied system font from ${systemPath} to ${targetPath}`);
      return targetPath;
    } catch (error) {
      console.log(`System font not found at ${systemPath}, trying next option...`);
    }
  }
  
  throw new Error(`No system fonts found for ${fontName}`);
}

/**
 * Downloads a font from the Google Fonts API.
 * @param fontName The name of the font from our map.
 * @returns A Buffer containing the font data.
 */
async function downloadFont(fontName: string): Promise<Buffer> {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontApiMap[fontName]}&display=swap`;
    console.log(`Fetching CSS from: ${cssUrl}`);
    
    const cssResponse = await fetch(cssUrl, {
      headers: {
        // Use a more modern user agent to get TTF files
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!cssResponse.ok) {
        throw new Error(`Failed to fetch font CSS for ${fontName}: ${cssResponse.statusText}`);
    }

    const cssText = await cssResponse.text();
    console.log(`CSS response for ${fontName}:`, cssText.substring(0, 500));
    
    // More robust regex to handle different URL formats
    // Look for WOFF2 files first (they work well), then WOFF, then TTF
    let fontUrlMatch = cssText.match(/url\(([^)]+\.woff2)\)/);
    
    if (!fontUrlMatch) {
        // Fallback to woff if woff2 not found
        fontUrlMatch = cssText.match(/url\(([^)]+\.woff)\)/);
    }
    
    if (!fontUrlMatch) {
        // Try TTF as last resort
        fontUrlMatch = cssText.match(/url\(([^)]+\.ttf)\)/);
    }
    
    if (!fontUrlMatch || !fontUrlMatch[1]) {
        console.error('Full CSS content:', cssText);
        throw new Error(`Could not find font URL for ${fontName} in CSS`);
    }

    let fontUrl = fontUrlMatch[1];
    // Remove quotes if present
    fontUrl = fontUrl.replace(/['"]/g, '');
    
    console.log(`Downloading font from: ${fontUrl}`);
    
    const fontResponse = await fetch(fontUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!fontResponse.ok) {
        throw new Error(`Failed to download font file for ${fontName}: ${fontResponse.statusText}`);
    }

    const arrayBuffer = await fontResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`Downloaded font size: ${buffer.length} bytes`);
    
    if (buffer.length < 5000) { // Lower threshold for woff files
        throw new Error(`Downloaded font file is too small (${buffer.length} bytes), likely corrupted`);
    }
    
    return buffer;
}

/**
 * Ensures that a specific font file exists in the public/fonts directory.
 * If it doesn't exist, it downloads it from the Google Fonts API.
 * @param fontName The name of the font (e.g., "Manrope-Bold").
 * @returns The full path to the font file.
 */
export const ensureFontExists = async (fontName: keyof typeof fontApiMap | string): Promise<string> => {
  // Handle Trebuchet MS as a special case by mapping to a similar Google Font
  if (fontName === 'TrebuchetMS-Italic') {
    fontName = 'Roboto-Medium'; 
  }
  
  if (!fontApiMap[fontName]) {
    console.warn(`Font "${fontName}" not in API map, defaulting to Roboto-Medium.`);
    fontName = 'Roboto-Medium';
  }

  const fontFileName = `${fontName}.ttf`;
  const fontPath = path.join(fontDir, fontFileName);

  try {
    const stats = await fs.stat(fontPath);
    // Check if file exists and is not corrupted (> 5KB for smaller woff files)
    if (stats.size > 5000) {
      console.log(`Font ${fontName} found locally and valid.`);
      return fontPath;
    } else {
      console.log(`Font ${fontName} exists but appears corrupted (${stats.size} bytes). Re-downloading...`);
      await fs.unlink(fontPath);
    }
  } catch {
    console.log(`Font ${fontName} not found locally. Downloading from Google Fonts...`);
  }
  
  await fs.mkdir(fontDir, { recursive: true });
  
  try {
    const fontBuffer = await downloadFont(fontName);
    await fs.writeFile(fontPath, fontBuffer);
    
    console.log(`Font ${fontName} downloaded and saved to ${fontPath}`);
    return fontPath;
  } catch (error) {
    console.error(`Failed to download font ${fontName}:`, error);
    
    // Try to use a system font as fallback
    try {
      console.log(`Attempting to use system font as fallback for ${fontName}...`);
      return await copySystemFont(fontName);
    } catch (systemError) {
      console.error(`System font fallback also failed:`, systemError);
      throw new Error(`Failed to download font ${fontName} and no system font available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};