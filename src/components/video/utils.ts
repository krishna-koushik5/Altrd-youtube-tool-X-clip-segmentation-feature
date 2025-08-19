// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Converts a timestamp string (HH:MM:SS.mmm) to seconds.
 * @param timeStr The timestamp string.
 * @returns The time in seconds as a float.
 */
export function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  try {
    const parts = timeStr.split(':');
    const secondsParts = parts[parts.length - 1].split('.');
    const hours = parts.length > 2 ? parseInt(parts[0], 10) : 0;
    const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2], 10) : 0;
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts.length > 1 ? parseInt(secondsParts[1], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  } catch (e) {
    console.error(`Error converting time string "${timeStr}" to seconds:`, e);
    return 0;
  }
} 