# ─── Stage 1: Build Rust contract ─────────────────────────────────────────────
FROM rust:1.75-slim AS contract-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev curl && \
    rustup target add wasm32-unknown-unknown && \
    cargo install --locked soroban-cli@20.0.0 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/contracts
COPY contracts/ .
RUN cargo build --target wasm32-unknown-unknown --release

# ─── Stage 2: Build React frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ─── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Copy built contract WASM
COPY --from=contract-builder /app/contracts/target/wasm32-unknown-unknown/release/lumina_agent.wasm ./contracts/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Install serve for frontend
RUN npm install -g serve

# Copy oracle
COPY oracle/ ./oracle/
RUN cd oracle && npm ci

# Copy scripts
COPY scripts/ ./scripts/
RUN cd scripts && npm ci

EXPOSE 3000

# Default: serve frontend. Override CMD to run oracle or scripts.
CMD ["serve", "-s", "frontend/build", "-l", "3000"]
