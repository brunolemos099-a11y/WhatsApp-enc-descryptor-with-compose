# syntax=docker/dockerfile:1
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY src ./src
COPY README.md ./

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
