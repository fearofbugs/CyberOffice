# syntax=docker/dockerfile:1.7

FROM node:16-bullseye AS build

WORKDIR /app

RUN yarn config set registry https://registry.npmjs.org \
  && yarn config set network-timeout 300000

COPY package.json yarn.lock ./
COPY types/package.json types/yarn.lock ./types/

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
  yarn install --frozen-lockfile \
  && cd types && yarn install --frozen-lockfile

COPY types ./types
COPY server ./server

RUN cd server && ../node_modules/.bin/tsc --project tsconfig.server.json

FROM node:16-bullseye-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN yarn config set registry https://registry.npmjs.org \
  && yarn config set network-timeout 300000

COPY server/package.json package.json
COPY server/yarn.lock yarn.lock

RUN yarn install --frozen-lockfile --production=true

COPY --from=build /app/server/lib ./server/lib

EXPOSE 2567

CMD ["node", "server/lib/server/index.js"]
