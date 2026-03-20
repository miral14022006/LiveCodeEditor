# ============================================================
#  UNIFIED DOCKERFILE — CodeSync Live Code Editor
# ============================================================
#  Single Dockerfile for the ENTIRE platform:
#    Stage 1: Build Frontend (React + Vite)
#    Stage 2: Production Backend + Frontend + All Language Runtimes
#
#  Supported execution languages (all installed in ONE image):
#    - JavaScript / Node.js 18
#    - Python 3
#    - C (gcc)
#    - C++ (g++)
#    - Java (OpenJDK 17)
#    - TypeScript (via npx tsx)
#    - HTML/CSS/JS (preview — no runtime needed)
#    - React JSX (preview — no runtime needed)
# ============================================================


# ══════════════════════════════════════════════════════════════
#  STAGE 1: Build Frontend
# ══════════════════════════════════════════════════════════════

FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files first (better Docker layer caching)
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build production bundle
RUN npm run build


# ══════════════════════════════════════════════════════════════
#  STAGE 2: Production Image — Backend + All Runtimes
# ══════════════════════════════════════════════════════════════

FROM node:18-alpine AS production

# ─── Install ALL language runtimes in one layer ────────────────
# This gives us: Node.js 18 (base), Python 3, GCC, G++, OpenJDK 17
RUN apk update && apk add --no-cache \
    # Python 3 runtime
    python3 \
    # C / C++ compilers
    gcc \
    g++ \
    musl-dev \
    # Java (OpenJDK 17)
    openjdk17-jdk \
    # Build tools (needed for native npm modules like bcrypt)
    make \
    # Docker CLI (to spawn execution containers if needed)
    docker-cli \
    # Nginx (to serve frontend)
    nginx \
    # Utilities
    wget \
    && rm -rf /var/cache/apk/*

# ─── Set JAVA_HOME ────────────────────────────────────────────
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH="$JAVA_HOME/bin:$PATH"

# ─── Setup Backend ────────────────────────────────────────────
WORKDIR /app/backend

# Copy backend package files (layer caching)
COPY backend/package*.json ./

# Install backend dependencies (production only)
RUN npm ci --only=production

# Copy backend source code
COPY backend/ .

# Create required directories
RUN mkdir -p public /tmp/code-execution

# ─── Setup Frontend (copy built files from Stage 1) ───────────
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# ─── Setup Nginx for Frontend ─────────────────────────────────
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf

# ─── Create non-root sandbox user for code execution ──────────
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# ─── Create entrypoint script ─────────────────────────────────
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo '# Start Nginx in background (serves frontend)' >> /app/entrypoint.sh && \
    echo 'nginx' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Start Backend (Node.js + Express)' >> /app/entrypoint.sh && \
    echo 'cd /app/backend && node src/index.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# ─── Expose ports ─────────────────────────────────────────────
# 80   = Frontend (Nginx)
# 8000 = Backend API + WebSocket
EXPOSE 80 8000

# ─── Health check ─────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/v1/health || exit 1

# ─── Start everything ─────────────────────────────────────────
CMD ["/app/entrypoint.sh"]
