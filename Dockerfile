# SBI Pulse — zero-dependency Node/TypeScript app
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY web ./web

ENV NODE_ENV=production
# Cloud Run injects PORT; the server reads it.
EXPOSE 8080

CMD ["node", "--experimental-strip-types", "src/server/server.ts"]
