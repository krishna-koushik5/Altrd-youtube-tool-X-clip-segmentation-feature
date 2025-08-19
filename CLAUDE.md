# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the YouTube Clip Edit Tool repository.

## Development Commands

### Core Commands
- `bun dev` - Start development server with Turbo for fast refresh
- `bun run build` - Build the application for production
- `bun start` - Start production server
- `bun run lint` - Run ESLint for code quality checks

### Dependencies Installation
- Python environment: `uv venv && uv pip install pytubefix`
- Node.js dependencies: `bun install`

### Prerequisites
- Python 3.8+ 
- UV (Python package manager): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- FFmpeg (required for video processing)
- Node.js and Bun

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.3.5 with React 19, TypeScript, TailwindCSS 4
- **Video Processing**: FFmpeg with fluent-ffmpeg, pytubefix for YouTube downloads
- **UI Components**: Radix UI primitives, custom form components
- **AI Integration**: OpenAI API for transcription, Google Generative AI
- **Canvas**: HTML5 Canvas API for text overlay generation

### Core Functionality
The YouTube Clip Edit Tool is a modern video repurposing application that allows users to:
1. Input YouTube URLs and load videos using the YouTube Iframe API
2. Select time segments with an interactive range slider
3. Generate captions using AI transcription services (OpenAI + Google Generative AI)
4. Create clips with customizable titles, captions, and credits using canvas-based overlays
5. Export videos in multiple aspect ratios optimized for social media platforms:
   - 9:16 (TikTok/Instagram Reels): 1080x1920
   - 16:9 (YouTube): 1920x1080
   - 1:1 (Instagram): 1080x1080
   - 4:5 (Instagram Story): 1080x1350
   - 3:4 (Portrait): 1080x1440

### Key Components Architecture

#### Video Processing Pipeline
1. **YouTube URL Processing** (`src/components/YouTubeClipper.tsx:71-86`):
   - Extracts video ID from YouTube URLs
   - Initializes YouTube Iframe API player

2. **Python Video Download** (`scripts/download_video.py`):
   - Uses pytubefix for high-quality 1080p downloads
   - Intelligent stream selection (DASH and progressive fallbacks)
   - FFmpeg integration for precise clipping

3. **Video Generation API** (`src/app/api/generate-video/route.ts`):
   - Combines downloaded video with text overlays
   - SRT subtitle generation and burning
   - Aspect ratio conversion and canvas positioning
   - Complex FFmpeg filter chains for compositing

#### Frontend Architecture
- **Main App** (`src/app/page.tsx`): Tab-based interface with clipper, saved clips, and generated videos
- **YouTube Clipper** (`src/components/YouTubeClipper.tsx`): Core clipping interface with video player and timeline
- **Video Components** (`src/components/video/`): Specialized video controls, settings, and canvas positioning
- **UI Components** (`src/components/ui/`): Reusable Radix UI-based components

### Video Processing Details

#### Text Overlay System
- Canvas-based text image generation (`src/lib/image-generator.ts`)
- Manual positioning system with configurable fonts, colors, and styling
- Support for title, caption, and credit overlays
- Dynamic aspect ratio handling

#### Caption Processing
- AI-powered transcription via `/api/transcribe` endpoint
- SRT format generation with timestamp adjustment
- Subtitle burning with customizable styling and positioning

#### Aspect Ratio Handling
The application supports multiple output formats with intelligent video scaling and positioning:
- **9:16 (TikTok/Reels)**: 1080x1920 - Vertical format optimized for mobile viewing
- **16:9 (YouTube)**: 1920x1080 - Standard widescreen format
- **1:1 (Instagram)**: 1080x1080 - Square format for Instagram posts
- **4:5 (Instagram Story)**: 1080x1350 - Optimized for Instagram Stories
- **3:4 (Portrait)**: 1080x1440 - Portrait orientation for various platforms

Each format includes intelligent video positioning, scaling, and text overlay placement to ensure optimal visual composition.

## File Structure Notes

### API Routes
- `/api/generate-video` - Main video processing endpoint with FFmpeg pipeline
- `/api/transcribe` - AI transcription service for caption generation
- `/api/test-timing` - Debug endpoint for caption timing validation

### Python Scripts
- `scripts/download_video.py` - YouTube video download with pytubefix and stream selection
- Uses UV virtual environment (`.venv/`) for dependency isolation
- Dependencies defined in `pyproject.toml`

### Key Libraries
- `pytubefix` - YouTube video downloading (replacement for pytube)
- `fluent-ffmpeg` - FFmpeg wrapper for video processing
- `canvas` - Server-side canvas for text image generation
- `react-range-slider-input` - Timeline segment selection
- `sonner` - Toast notifications
- `zod` - Runtime type validation

### State Management
The application uses React's built-in state management:
- Video player state via YouTube Iframe API
- Clip management with local state in main App component
- Form state managed via react-hook-form with Zod validation

## Development Notes

### Python Environment Setup
The project uses UV for Python dependency management with a virtual environment:
- `uv venv` creates `.venv/` directory
- `pyproject.toml` defines dependencies (pytubefix)
- Node.js API automatically uses venv Python if available, falls back to system Python

### Video Download Process
The Python script (`scripts/download_video.py`) handles intelligent stream selection, preferring 1080p DASH streams with audio/video merging via FFmpeg. The Node.js API communicates with this script via spawn processes.

### FFmpeg Filter Chains
Complex video processing uses multi-input FFmpeg commands with filter graphs for:
- Video scaling and aspect ratio conversion
- Text overlay positioning
- Subtitle burning with custom styling
- Audio stream preservation

### Testing and Quality Assurance
No specific test framework is currently configured. When implementing tests, focus on:
- Video download functionality with various YouTube URLs
- FFmpeg processing pipeline and filter chain validation
- API endpoint responses and error handling
- UI component interactions and form validation
- Python script integration and error handling
- Canvas text overlay generation accuracy

### Deployment Notes
- Ensure FFmpeg is available in the deployment environment
- Python virtual environment must be properly configured with UV
- Environment variables for OpenAI and Google AI API keys required
- Consider memory and processing limits for video operations