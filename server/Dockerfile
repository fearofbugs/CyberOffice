FROM node:16-bullseye

WORKDIR /app

COPY package.json yarn.lock ./
COPY types/package.json types/yarn.lock ./types/
COPY client/package.json client/yarn.lock ./client/

RUN yarn install --frozen-lockfile

COPY types ./types
COPY server ./server

EXPOSE 2567

CMD ["yarn", "start"]
