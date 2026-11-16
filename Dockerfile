# Builds the website, then runs the API, which also serves the built site from dist/.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix server --omit=dev
COPY server/src server/src
COPY server/seed server/seed
COPY --from=build /app/dist dist
# Cap the JavaScript heap so Node cleans up early instead of growing because the container has RAM to spare.
# Files are streamed and upload buffers live outside this heap, so 128 MB leaves plenty of room.
CMD ["node", "--max-old-space-size=128", "server/src/index.ts"]
