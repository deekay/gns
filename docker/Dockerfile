FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm ci --no-audit --no-fund \
  && npm run build \
  && mkdir -p /app/.data

COPY docker/entrypoint.sh /usr/local/bin/ont-entrypoint
RUN chmod 755 /usr/local/bin/ont-entrypoint

ENTRYPOINT ["ont-entrypoint"]
CMD ["web"]
