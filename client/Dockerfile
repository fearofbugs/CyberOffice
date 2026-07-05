# syntax=docker/dockerfile:1.7

FROM node:16-bullseye AS build

WORKDIR /app

RUN yarn config set registry https://registry.npmjs.org \
  && yarn config set network-timeout 300000

ARG VITE_SERVER_URL=ws://localhost:2567
ARG CLIENT_BUILD_COMMAND=build:fast
ENV VITE_SERVER_URL=$VITE_SERVER_URL

COPY client/package.json client/yarn.lock ./client/
COPY types/package.json types/yarn.lock ./types/

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
  cd types && yarn install --frozen-lockfile \
  && cd ../client && yarn install --frozen-lockfile

COPY types ./types
COPY client ./client

RUN --mount=type=cache,target=/app/client/node_modules/.vite \
  cd client && yarn "$CLIENT_BUILD_COMMAND"

FROM caddy:2.8-alpine

COPY client/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/client/dist /srv

EXPOSE 80
EXPOSE 443
