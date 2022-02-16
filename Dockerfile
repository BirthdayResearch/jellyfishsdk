FROM node:16-alpine3.13

# Add curl to use docker healthcheck capability
RUN apk --no-cache add curl

WORKDIR /app

COPY LICENSE ./
COPY package.json ./
COPY package-lock.json ./

COPY tsconfig.base.json ./
COPY tsconfig.build.json ./
COPY tsconfig.json ./

COPY packages ./packages
COPY apps ./apps

RUN npm ci
RUN npm run all:build

RUN ln apps/legacy-api/dist/apps/legacy-api/src legacy-api
RUN ln apps/ocean-api/dist/apps/ocean-api/src ocean-api

ENTRYPOINT node
