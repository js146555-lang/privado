FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev --no-fund
COPY client ./client
COPY vite.config.mjs ./
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --no-fund && npm cache clean --force
COPY --chown=node:node server ./server
COPY --chown=node:node --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["npm", "start"]
