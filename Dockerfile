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
RUN cargo build --release

# --- Stage 2: Build Frontend ---
FROM node:20-slim as frontend-builder
WORKDIR /app/frontend

# Explicitly set production environment
ENV NODE_ENV production

COPY ./frontend/package*.json ./
RUN npm install

COPY ./frontend .
# Build static export (will trigger output: 'export' in next.config.ts)
RUN npm run build

# --- Stage 3: Final Image ---
FROM caddy:2-alpine
WORKDIR /app

# Install runtime dependencies for the Rust binary
RUN apk add --no-cache libc6-compat ca-certificates

# Copy artifacts from builders
COPY --from=backend-builder /app/backend/target/release/law-compare-backend /app/law-compare-backend
COPY --from=frontend-builder /app/frontend/out /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Startup script to run both backend and Caddy
RUN echo "#!/bin/sh" > /app/start.sh && \
    echo "/app/law-compare-backend &" >> /app/start.sh && \
    echo "caddy run --config /etc/caddy/Caddyfile --adapter caddyfile" >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
