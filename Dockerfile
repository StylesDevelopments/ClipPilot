# ---- Builder ----------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runner -----------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# FFmpeg (with vid.stab) + ffprobe are required at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
# Store media on a mounted volume by default.
ENV STORAGE_DIR=/data/storage

# Next.js standalone output: server + only the deps it actually needs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /data/storage
VOLUME ["/data/storage"]

EXPOSE 3000
CMD ["node", "server.js"]
