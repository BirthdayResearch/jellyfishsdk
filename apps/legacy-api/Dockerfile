FROM node:16-alpine3.13

RUN apk --no-cache add curl

WORKDIR /app

COPY --from=defi/jellyfish ./app .
COPY . ./apps/legacy-api

RUN npm ci
RUN npm run all:build

CMD ["node", "apps/legacy-api/dist/index"]
