FROM node:16-alpine3.13
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Add curl to use docker healthcheck capability
RUN apk --no-cache add curl

WORKDIR /app

COPY LICENSE ./

COPY lerna.json ./
COPY tsconfig.base.json ./
COPY tsconfig.build.json ./
COPY tsconfig.json ./

COPY package.json ./
COPY package-lock.json ./

COPY packages ./packages
COPY apps ./apps

RUN npm ci
RUN npm run build --workspace=apps

ARG APP
ENV APP ${APP}
RUN ln -s apps/dist/apps/${APP}/src ${APP}

CMD "node" ${APP}
