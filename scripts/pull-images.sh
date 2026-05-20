#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_TAG="${1:-}"
if [ -z "$UPSTREAM_TAG" ]; then
  echo "Usage: $0 <upstream-tag>" >&2
  exit 1
fi

FRONTEND=registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-frontend:"$UPSTREAM_TAG"
BACKEND=registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-backend:"$UPSTREAM_TAG"

PULLED=false
if docker pull "$FRONTEND" && docker pull "$BACKEND"; then
  echo "Images pulled from registry successfully."
  PULLED=true
else
  echo "Registry pull failed — falling back to local build."
fi

if [ "$PULLED" = "false" ]; then
  UPSTREAM_DIR=/tmp/bitcoin-cash-explorer-upstream
  rm -rf "$UPSTREAM_DIR"
  git clone --depth 1 --branch "$UPSTREAM_TAG" https://github.com/BitcoinCash1/bitcoin-cash-explorer.git "$UPSTREAM_DIR"
  (cd "$UPSTREAM_DIR" && ./docker/init.sh "$UPSTREAM_TAG")
  SHORT_SHA=$(git rev-parse --short HEAD)

  cat > "$UPSTREAM_DIR/docker/frontend/Dockerfile.startos" <<'EOF'
FROM node:24-bookworm AS builder
ARG commitHash
ENV DOCKER_COMMIT_HASH=${commitHash} CYPRESS_INSTALL_BINARY=0 NODE_ENV=production SKIP_SYNC=1
WORKDIR /build
COPY . .
RUN apt-get update && apt-get install -y build-essential rsync && corepack enable
RUN cp explorer-frontend-config.sample.json explorer-frontend-config.json && pnpm install && pnpm build
FROM nginx:1.29.4-alpine
WORKDIR /patch
COPY --from=builder /build/entrypoint.sh /build/wait-for /patch/
COPY --from=builder /build/dist/explorer /var/www/explorer
COPY --from=builder /build/nginx.conf /etc/nginx/
COPY --from=builder /build/nginx-explorer.conf /etc/nginx/conf.d/
RUN chmod +x /patch/entrypoint.sh /patch/wait-for
RUN chown -R 1000:1000 /patch /var/cache/nginx /var/log/nginx /etc/nginx/nginx.conf /etc/nginx/conf.d /var/www/explorer
RUN touch /var/run/nginx.pid && chown 1000:1000 /var/run/nginx.pid
USER 1000
ENTRYPOINT ["/patch/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
EOF

  cat > "$UPSTREAM_DIR/docker/backend/Dockerfile.startos" <<'EOF'
FROM node:24-bookworm AS builder
ARG commitHash
ENV MEMPOOL_COMMIT_HASH=${commitHash} NODE_ENV=production PATH="/root/.cargo/bin:${PATH}"
RUN apt-get update && apt-get install -y curl build-essential pkg-config libssl-dev ca-certificates
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal && corepack enable
WORKDIR /build
COPY --chown=node:node . .
COPY --chown=node:node --from=backend . .
COPY --chown=node:node --from=rustgbt . ../rust/
ENV FD=/build/rust-gbt
RUN mkdir -p rust-gbt && pnpm preinstall && rm -rf node_modules/.pnpm-workspace-state-v1.json && pnpm install --prod && pnpm package
FROM node:24-bookworm-slim AS runtime
ENV NODE_OPTIONS=--max-old-space-size=16384 NODE_ENV=production
WORKDIR /backend
RUN chown 1000:1000 ./
COPY --from=builder --chown=1000:1000 /build/package ./package/
COPY --from=builder --chown=1000:1000 /build/explorer-config-template.json /build/start.sh /build/wait-for-it.sh ./
RUN mv explorer-config-template.json explorer-config.json
HEALTHCHECK --interval=40s --timeout=20s --start-period=40s --retries=5 CMD node package/healthcheck.js
USER 1000
EXPOSE 8999
CMD ["/backend/start.sh"]
EOF

  docker build --build-arg commitHash="$SHORT_SHA" \
    -t "$FRONTEND" -f "$UPSTREAM_DIR/docker/frontend/Dockerfile.startos" "$UPSTREAM_DIR/frontend"
  docker build \
    --build-context backend="$UPSTREAM_DIR/backend" \
    --build-context rustgbt="$UPSTREAM_DIR/rust" \
    --build-arg commitHash="$SHORT_SHA" \
    -t "$BACKEND" -f "$UPSTREAM_DIR/docker/backend/Dockerfile.startos" "$UPSTREAM_DIR/backend"
fi

docker image inspect "$FRONTEND" >/dev/null
docker image inspect "$BACKEND" >/dev/null
