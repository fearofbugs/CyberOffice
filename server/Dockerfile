FROM node:16-bullseye

WORKDIR /app

RUN yarn config set registry https://registry.npmjs.org \
  && yarn config set network-timeout 300000

COPY package.json yarn.lock ./
COPY types/package.json types/yarn.lock ./types/
COPY client/package.json client/yarn.lock ./client/

RUN yarn install --frozen-lockfile

COPY types ./types
COPY server ./server

EXPOSE 2567

CMD ["yarn", "start"]
