FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

RUN npm prune --omit=dev

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "dist/server-http.js"]
