# ============================================================
#  FINAL DOCKERFILE — Render Compatible (Full Stack)
# ============================================================

# ─────────────── STAGE 1: Build Frontend ───────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build


# ─────────────── STAGE 2: Production ───────────────
FROM node:20-alpine

# Install required runtimes
RUN apk add --no-cache \
    python3 \
    gcc \
    g++ \
    musl-dev \
    openjdk17-jdk \
    make \
    wget

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH="$JAVA_HOME/bin:$PATH"

# ─────────────── Backend Setup ───────────────
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

# ─────────────── Copy Frontend Build ───────────────
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# ─────────────── Create runtime dirs ───────────────
RUN mkdir -p /tmp/code-execution

# ─────────────── Expose SINGLE PORT ───────────────
EXPOSE 10000

# ─────────────── Start ONLY backend (serves frontend) ───────────────
CMD ["node", "src/index.js"]
