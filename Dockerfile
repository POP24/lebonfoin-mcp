FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "dist/server-http.js"]
