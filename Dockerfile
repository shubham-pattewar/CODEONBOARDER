FROM node:22-alpine

# Install git for shallow cloning
RUN apk add --no-cache git

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies including typescript
RUN npm install --include=dev

# Copy all source code
COPY . .

# Build the backend server
RUN npm run build:server

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "server/dist/server.js"]
