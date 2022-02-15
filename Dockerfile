FROM node:16-alpine3.13

# add curl for docker healthcheck capability
RUN apk --no-cache add curl

WORKDIR /app

COPY packages ./packages
COPY lerna.json ./lerna.json
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY tsconfig.build.json ./tsconfig.build.json
COPY tsconfig.json ./tsconfig.json

RUN npm ci
RUN npm run all:build

CMD ["true"]
