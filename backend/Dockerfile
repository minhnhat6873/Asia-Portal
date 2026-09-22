FROM node:20-alpine AS development

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 4000

CMD ["yarn", "dev"]


FROM development AS builder

RUN yarn build


FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]