# syntax=docker/dockerfile:1.7

# --- Build stage -----------------------------------------------------------
# node:20-alpine satisfies engines.node (>=20.19) and .nvmrc (20.19.0); the
# CI workflow pins the same major via node-version-file: .nvmrc.
FROM node:20-alpine AS build
WORKDIR /app

# Lockfile-locked install as its own cached layer (re-runs only when deps change).
COPY package*.json ./
RUN npm ci

# App sources after deps so editing src/ doesn't bust the npm cache layer.
COPY . .

# VITE_API_BASE_URL is baked into the bundle AT BUILD TIME (Vite has no runtime
# override). Compose passes "" so the bundle issues same-origin /api/* requests
# that nginx proxies to the backend (axios.ts uses ?? so "" is preserved).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- Runtime stage ---------------------------------------------------------
# Unprivileged nginx: runs as uid 101 (nginx) and listens on 8080.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# busybox wget (curl absent). HEALTHCHECK CMD runs via /bin/sh so `||` works.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

# No USER directive — the base image already runs unprivileged (uid 101).
