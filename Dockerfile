# ---- build deps/cache ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ curl
COPY package.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=deps /app/node_modules /app/node_modules
COPY src ./src
COPY package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
