#!/usr/bin/env python3
"""
Simple YouTube Video Downloader using yt-dlp
Downloads the highest quality progressive MP4 stream without any processing
"""

import subprocess
import sys
import os
import json
import tempfile


def download_with_ytdlp(url, output_path):
    """
    Download the highest quality progressive MP4 stream from YouTube URL
    Returns True on success, False on failure
    """
    # Use local yt-dlp.exe for Windows
    YTDLP_PATH = (
        os.path.join(os.path.dirname(__file__), "..", "yt-dlp.exe")
        if sys.platform == "win32"
        else "yt-dlp"
    )

    # Always delete the temp file before running yt-dlp
    if os.path.exists(output_path):
        os.remove(output_path)

    # Command to download highest quality progressive MP4 (video + audio in one file)
    cmd = [
        YTDLP_PATH,
        "-f",
        "best[ext=mp4][vcodec^=avc1]/best[ext=mp4]/mp4",  # Prefer progressive MP4
        "-o",
        output_path,
        url,
    ]
    # Only add --cookies if cookies.txt exists and is a valid Netscape format file
    cookies_path = os.path.join(os.path.dirname(__file__), "cookies.txt")
    if os.path.exists(cookies_path):
        with open(cookies_path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline().strip()
            if first_line.startswith("# Netscape HTTP Cookie File"):
                cmd.insert(-1, "--cookies")
                cmd.insert(-1, cookies_path)
            else:
                print(
                    "cookies.txt exists but is not a valid Netscape format file, ignoring.",
                    file=sys.stderr,
                )

    # All debug output to stderr
    print("Running command:", " ".join(cmd), file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True)
    print("yt-dlp stdout:", result.stdout, file=sys.stderr)
    print("yt-dlp stderr:", result.stderr, file=sys.stderr)

    return result.returncode == 0


def get_video_resolution(output_path):
    """
    Get the resolution of the downloaded video using ffprobe
    Returns resolution string like "1080p" or "720p"
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=height",
            "-of",
            "csv=s=x:p=0",
            output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            height = int(result.stdout.strip())
            if height >= 1080:
                return "1080p"
            elif height >= 720:
                return "720p"
            elif height >= 480:
                return "480p"
            else:
                return f"{height}p"
        else:
            return "unknown"
    except:
        return "unknown"


def main():
    if len(sys.argv) < 5:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Usage: python download_video.py <url> <start_time> <end_time> <output_path>",
                }
            )
        )
        sys.exit(1)

    url, start_time, end_time, output_path = sys.argv[1:5]

    # Note: start_time and end_time are ignored - Node.js will handle trimming

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        success = download_with_ytdlp(url, output_path)

        # Check if file exists and is at least 1000 bytes
        if (
            not success
            or not os.path.exists(output_path)
            or os.path.getsize(output_path) < 1000
        ):
            print(
                json.dumps(
                    {
                        "success": False,
                        "error": "yt-dlp failed or produced invalid file. See logs above.",
                    }
                )
            )
            if os.path.exists(output_path):
                os.remove(output_path)
            sys.exit(1)

        # Get video resolution for reporting
        resolution = get_video_resolution(output_path)

        print(
            json.dumps(
                {"success": True, "resolution": resolution, "output_path": output_path}
            )
        )

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        if os.path.exists(output_path):
            os.remove(output_path)
        sys.exit(1)


if __name__ == "__main__":
    main()
