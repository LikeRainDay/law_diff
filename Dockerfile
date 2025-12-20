# --- Stage 1: Build Backend ---
FROM rust:1.83-slim as backend-builder
WORKDIR /app/backend

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Optimize build with dependency caching
COPY ./backend/Cargo.toml ./backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy real source and build
COPY ./backend .
# Ensure cargo sees the changed files even if timestamps are weird
RUN touch src/main.rs && cargo build --release

# --- Stage 2: Build Frontend ---
FROM node:20-slim as frontend-builder
WORKDIR /app/frontend

COPY ./frontend/package*.json ./
# Install all dependencies (including devDependencies) needed for building
RUN npm install

COPY ./frontend .
# Build static export (will trigger output: 'export' in next.config.ts)
ENV NODE_ENV production
RUN npm run build

# --- Stage 3: Final Image ---
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies for the Rust binary and Caddy
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy Caddy from official image to our Debian-based final image
COPY --from=caddy:2 /usr/bin/caddy /usr/bin/caddy

# Copy artifacts from builders
COPY --from=backend-builder /app/backend/target/release/law-compare-backend ./law-compare-backend
COPY --from=backend-builder /app/backend/examples ./examples
COPY --from=frontend-builder /app/frontend/out /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Startup script to run both backend and Caddy
RUN echo "#!/bin/sh" > /app/start.sh && \
    echo "/app/law-compare-backend > /dev/stdout 2>&1 &" >> /app/start.sh && \
    echo "exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile" >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
