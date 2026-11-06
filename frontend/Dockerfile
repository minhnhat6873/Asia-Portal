FROM node:26.13.0-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global yarn@1.22.22
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG BACKEND_API_URL=http://backend:4000
ARG NEXT_PUBLIC_TINYMCE_API_KEY
ARG NEXT_PUBLIC_NETWORK_FOLDER_PATH
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_TINYMCE_API_KEY=$NEXT_PUBLIC_TINYMCE_API_KEY
ENV NEXT_PUBLIC_NETWORK_FOLDER_PATH=$NEXT_PUBLIC_NETWORK_FOLDER_PATH
ENV NEXT_OUTPUT_STANDALONE=true
RUN yarn build

FROM node:26.13.0-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
