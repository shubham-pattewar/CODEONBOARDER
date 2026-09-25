FROM node:22-alpine

# Install git for shallow cloning
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npx tsc

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
