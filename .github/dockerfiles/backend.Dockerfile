# Replacement Dockerfile for BCH Explorer backend.
# Uses public base images instead of Melroy's private registry.melroy.org images.

FROM rust:slim-bookworm AS builder

ARG commitHash
ENV MEMPOOL_COMMIT_HASH=${commitHash}
ENV NODE_ENV=production

# Install Node.js 24 and pnpm
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY --chown=root:root . .

ENV PATH="/usr/local/cargo/bin:$PATH"

COPY --chown=root:root --from=backend . .
COPY --chown=root:root --from=rustgbt . ../rust/
ENV FD=/build/rust-gbt

RUN pnpm preinstall
RUN pnpm install --prod
RUN pnpm package

FROM node:24-slim AS runtime

ENV NODE_OPTIONS=--max-old-space-size=16384
ENV NODE_ENV=production

WORKDIR /backend

RUN chown 1000:1000 ./
COPY --from=builder --chown=1000:1000 /build/package ./package/
COPY --from=builder --chown=1000:1000 /build/explorer-config-template.json /build/start.sh /build/wait-for-it.sh ./
RUN mv explorer-config-template.json explorer-config.json

HEALTHCHECK --interval=40s --timeout=20s --start-period=40s --retries=5 \
  CMD node package/healthcheck.js

USER 1000

EXPOSE 8999

CMD ["/backend/start.sh"]
