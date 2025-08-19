# 🎬 YouTube Clip Edit Tool

A modern YouTube video repurposing application built with Next.js, Bun, and Python. Create engaging clips with AI-powered transcription, customizable text overlays, and multi-format export capabilities.

## ✨ Features

- **YouTube Video Integration**: Load videos directly from YouTube URLs using the YouTube Iframe API
- **Interactive Timeline**: Select precise time segments with an intuitive range slider
- **AI-Powered Captions**: Automatic transcription using OpenAI and Google Generative AI
- **Custom Text Overlays**: Add titles, captions, and credits with configurable styling
- **Multi-Format Export**: Support for 9:16, 16:9, 1:1, 4:5, and 3:4 aspect ratios
- **High-Quality Processing**: 1080p downloads with intelligent stream selection
- **Modern UI**: Built with React 19, TailwindCSS 4, and Radix UI components

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.3.5, React 19, TypeScript, TailwindCSS 4
- **Backend**: Node.js with Bun runtime
- **Video Processing**: FFmpeg, pytubefix, fluent-ffmpeg
- **AI Services**: OpenAI API, Google Generative AI
- **UI Components**: Radix UI primitives
- **Python Environment**: UV package manager

## 📦 Prerequisites

- **Node.js** (latest LTS)
- **Bun** (JavaScript runtime and package manager)
- **Python 3.8+**
- **UV** (Python package manager): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **FFmpeg** (for video processing)

## 🚀 Installation

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd clip-edit-tool

# Install Node.js dependencies with Bun
bun install

# Setup Python virtual environment and dependencies
uv venv
uv pip install pytubefix
```

### 2. Environment Setup
Ensure FFmpeg is installed and accessible in your PATH:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## 🏃 Development

### Available Scripts
```bash
# Start development server with Turbo
bun dev

# Build for production
bun run build

# Start production server
bun start

# Run linting
bun run lint
```

### 🔍 How It Works

1. **Video Processing Pipeline**
   - YouTube URL parsing and video loading via YouTube Iframe API
   - High-quality video download using pytubefix with intelligent stream selection
   - FFmpeg-powered video clipping with precise timestamps

2. **AI-Powered Transcription**
   - Automatic caption generation using OpenAI and Google Generative AI
   - SRT subtitle format with timestamp synchronization
   - Subtitle burning with customizable styling

3. **Multi-Format Export**
   - Canvas-based text overlay generation
   - Complex FFmpeg filter chains for aspect ratio conversion
   - Support for multiple social media formats (TikTok, YouTube, Instagram)

### 🏗️ Architecture

- **Frontend**: Tab-based interface with real-time video preview
- **API Routes**: `/api/generate-video`, `/api/transcribe`, `/api/test-timing`
- **Python Scripts**: `scripts/download_video.py` for YouTube video handling
- **Virtual Environment**: UV-managed Python dependencies in `.venv/`

### 📁 Key Files

- `src/app/page.tsx` - Main application interface
- `src/components/YouTubeClipper.tsx` - Core video clipping component
- `src/app/api/generate-video/route.ts` - Video processing API
- `scripts/download_video.py` - YouTube download script
- `pyproject.toml` - Python dependencies configuration

### 🐛 Troubleshooting

- **FFmpeg Issues**: Ensure FFmpeg is installed and in your PATH
- **Python Environment**: Check `.venv/` directory exists and pytubefix is installed
- **Video Downloads**: Check `/tmp/pytubefix_download.log` for detailed logs
- **Development**: Use `bun dev` with Turbo for fast refresh during development

### 📝 License
MIT License

### 🤝 Contributing
Pull requests welcome! Please ensure all tests pass and follow the existing code style.
