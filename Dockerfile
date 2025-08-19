FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    bash \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconfig \
    make \
    g++

# Install bun and uv
RUN curl -fsSL https://bun.sh/install | bash
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.bun/bin:/root/.local/bin:$PATH"

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* pyproject.toml uv.lock* ./

# Install Python dependencies
RUN uv venv .venv && \
    source .venv/bin/activate && \
    uv pip install pytubefix

# Install Node.js dependencies
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PATH="/app/.venv/bin:$PATH"

# Start the application
CMD ["bun", "start"]