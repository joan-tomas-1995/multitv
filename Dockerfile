FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.mjs ./
COPY data ./data
COPY public ./public

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
EXPOSE 5173

CMD ["node", "server.mjs"]
