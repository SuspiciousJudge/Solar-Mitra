# ============================================================
# Stage 1 — Install ALL dependencies (needed for build)
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy root manifests
COPY package.json package-lock.json ./

# Copy sub-package manifests
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/

# Install root + sub-packages (postinstall script handles server + client)
# --ignore-scripts prevents the client from running native tesseract bindings during install
RUN npm ci --ignore-scripts


# ============================================================
# Stage 2 — Build the React client (Vite → client/dist)
# ============================================================
FROM node:22-alpine AS build-client

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy source
COPY client/ ./client/
COPY package.json ./

# Build the SPA; VITE_API_URL=/api keeps everything same-origin
ENV VITE_API_URL=/api
ENV VITE_DEMO_MODE=true

RUN npm run build:client


# ============================================================
# Stage 3 — Build the Express server (tsc → server/dist)
# ============================================================
FROM node:22-alpine AS build-server

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

COPY server/ ./server/
COPY package.json ./

# The server build only uses the server/tsconfig.build.json
RUN npm run build:server


# ============================================================
# Stage 4 — Lean production runtime
# ============================================================
FROM node:22-alpine AS runtime

# Security: run as non-root
RUN addgroup -S solarmitra && adduser -S solarmitra -G solarmitra

WORKDIR /app

# Install only production dependencies for the server
COPY --from=deps /app/server/package.json ./server/package.json
COPY --from=deps /app/server/package-lock.json ./server/package-lock.json

# Production install (no devDeps, no scripts)
RUN cd server && npm ci --only=production --ignore-scripts

# Copy compiled server
COPY --from=build-server /app/server/dist ./server/dist

# Copy the built SPA — Express serves it from client/dist relative to server/dist
COPY --from=build-client /app/client/dist ./client/dist

# tesseract.js language data is bundled in client build; no extra copy needed
# Provider document uploads land in server/var — create it and hand ownership to solarmitra
RUN mkdir -p server/var/provider-docs && chown -R solarmitra:solarmitra /app

USER solarmitra

# The Express server already binds to 0.0.0.0 (see server/src/server.ts)
EXPOSE 5000

# Default env — all can be overridden at runtime via --env-file or -e
ENV NODE_ENV=production \
    PORT=5000 \
    DEMO_MODE=true

CMD ["node", "server/dist/server.js"]
