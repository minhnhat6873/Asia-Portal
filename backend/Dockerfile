FROM node:26.13.0-alpine AS development

WORKDIR /app

RUN npm install --global yarn@1.22.22

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 4000

CMD ["yarn", "dev"]


FROM development AS builder

RUN yarn build


FROM node:26.13.0-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN npm install --global yarn@1.22.22

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 4000

CMD ["node", "dist/index.js"]
