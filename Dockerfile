FROM node:20-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .

RUN mkdir -p logs && chown -R app:app /app

USER app

EXPOSE 3847

CMD ["node", "src/index.js"]
