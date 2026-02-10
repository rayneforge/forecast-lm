# ─── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all workspace packages (needed for workspace:* deps)
COPY packages/ packages/
COPY apps/public-client/ apps/public-client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the public-client app
WORKDIR /app/apps/public-client
RUN pnpm run build

# ─── Stage 2: Serve with nginx ──────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/apps/public-client/dist /usr/share/nginx/html

# SPA fallback: route all paths to index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
