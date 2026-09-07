FROM node:22.19.0-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --include=dev

COPY supabase/config.toml ./supabase/config.toml
COPY scripts/p0-3-remote-db-evidence.mjs ./scripts/p0-3-remote-db-evidence.mjs
COPY scripts/p0-3-remote-db-evidence-lib.mjs ./scripts/p0-3-remote-db-evidence-lib.mjs
COPY scripts/p0-3-remote-db-evidence.sql ./scripts/p0-3-remote-db-evidence.sql

ENV NODE_ENV=production
USER node

ENTRYPOINT ["node", "scripts/p0-3-remote-db-evidence.mjs"]
