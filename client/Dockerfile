# syntax=docker/dockerfile:1.7

FROM node:16-bullseye AS build

WORKDIR /app

RUN yarn config set registry https://registry.npmjs.org \
  && yarn config set network-timeout 300000

COPY client/package.json client/yarn.lock ./client/
COPY types/package.json types/yarn.lock ./types/

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
  cd types && yarn install --frozen-lockfile \
  && cd ../client && yarn install --frozen-lockfile

COPY types ./types
COPY client ./client

ARG VITE_SERVER_URL=
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN cd client && yarn build

FROM node:16-bullseye-slim

WORKDIR /app

RUN yarn global add serve@14.2.4

COPY --from=build /app/client/dist ./dist

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
