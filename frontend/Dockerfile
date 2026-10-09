FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG BACKEND_API_URL=http://backend:4000
ARG NEXT_PUBLIC_TINYMCE_API_KEY
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_TINYMCE_API_KEY=$NEXT_PUBLIC_TINYMCE_API_KEY
ENV NEXT_OUTPUT_STANDALONE=true
RUN yarn build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
