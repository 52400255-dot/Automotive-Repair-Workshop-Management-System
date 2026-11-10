FROM node:22-alpine

WORKDIR /workspace

COPY backend/package*.json ./backend/
WORKDIR /workspace/backend
RUN npm ci --omit=dev

WORKDIR /workspace
COPY backend/src ./backend/src
COPY database ./database

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
