
import { createCanvas, registerFont } from 'canvas';
import { ensureFontExists } from './fonts';

interface TextToImageOptions {
  text: string;
  width: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  strokeWidth?: number;
  strokeColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  fontStyle?: string;
}

/**
 * Creates a PNG image buffer from text with word wrapping.
 * @param options The text and styling options.
 * @returns A Buffer containing the PNG image data.
 */
export const createTextImage = async (options: TextToImageOptions): Promise<Buffer> => {
  const {
    text,
    width: rawWidth,
    fontSize = 40,
    fontColor = 'white',
    fontFamily = 'Inter-Medium',
    strokeWidth = 0,
    strokeColor = 'black',
    textAlign = 'center',
    fontWeight = 'normal',
    fontStyle = 'normal',
  } = options;

  // Add bounds checking for width to prevent memory issues
  const width = Math.min(Math.max(rawWidth, 1), 32767);
  if (rawWidth !== width) {
    console.warn(`Canvas width clamped from ${rawWidth} to ${width}`);
  }

  // Add text length validation to prevent excessive processing
  const maxTextLength = 50000;
  const processedText = text.length > maxTextLength ? 
    text.substring(0, maxTextLength) + '...' : text;
  
  if (text.length > maxTextLength) {
    console.warn(`Text too long, truncating from ${text.length} to ${maxTextLength} characters`);
  }

  let finalFontFamily = fontFamily;

  try {
    // 1. Ensure the font is available and register it
    console.log(`Attempting to load font: ${fontFamily}`);
    const fontPath = await ensureFontExists(fontFamily as any);
    registerFont(fontPath, { family: fontFamily });
    console.log(`Successfully registered font: ${fontFamily}`);
  } catch (error) {
    console.warn(`Failed to load font ${fontFamily}, falling back to system font:`, error);
    // Fall back to a system font that should always be available
    finalFontFamily = 'Arial, sans-serif';
  }

  // 2. Create a temporary canvas to measure text
  const tempCanvas = createCanvas(width, 100);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${finalFontFamily}`;

  // 3. Implement word wrapping
  const words = processedText.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const metrics = tempCtx.measureText(testLine);
    if (metrics.width > width && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // 4. Create the final canvas with the correct height
  const lineHeight = fontSize * 1.2;
  
  // Add bounds checking to prevent array length errors
  const maxLines = Math.floor((32767 - 20) / lineHeight); // Max safe canvas height
  const limitedLines = lines.slice(0, maxLines);
  
  if (lines.length > maxLines) {
    console.warn(`Text too long, truncating to ${maxLines} lines (original: ${lines.length} lines)`);
  }
  
  const canvasHeight = limitedLines.length * lineHeight + 20; // Add padding
  const finalCanvas = createCanvas(width, canvasHeight);
  const ctx = finalCanvas.getContext('2d');

  // 5. Draw the text onto the final canvas
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${finalFontFamily}`;
  ctx.textAlign = textAlign;
  
  // Calculate x position based on alignment
  let xPos = width / 2;
  if (textAlign === 'left') {
    xPos = 20; // 20px padding from left
  } else if (textAlign === 'right') {
    xPos = width - 20; // 20px padding from right
  }

  limitedLines.forEach((line, index) => {
    const yPos = (index + 1) * lineHeight - (lineHeight - fontSize) / 2;
    
    // Draw stroke if specified
    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 2;
      ctx.strokeText(line, xPos, yPos);
    }
    
    // Draw fill text
    ctx.fillStyle = fontColor;
    ctx.fillText(line, xPos, yPos);
  });
  
  // 6. Return the result as a PNG buffer
  return finalCanvas.toBuffer('image/png');
}; 