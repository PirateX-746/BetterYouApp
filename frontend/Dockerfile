# BetterYou web app (Next.js standalone server).
#
# NEXT_PUBLIC_* values are baked into the JS bundle at build time, so they
# are build args, not runtime env. The defaults suit the single-domain
# setup in deploy/: the browser calls /api, /socket.io and /sse on the same
# origin and Caddy routes them to the backend.
FROM node:20-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=/api
# Empty = same origin as the page (socket.io and EventSource both accept it).
ARG NEXT_PUBLIC_SOCKET_URL=
ARG NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY=
# Server-side /api rewrite target, used only if a request reaches Next.
ARG BACKEND_URL=http://backend:3002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY=$NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY \
    BACKEND_URL=$BACKEND_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
