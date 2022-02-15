FROM node:16-alpine3.13

WORKDIR /app

COPY --from=defi/jellyfish ./app .
COPY . ./apps/ocean-api

RUN npm ci
RUN npm run build --workspace=apps/ocean-api

CMD ["node", "apps/ocean-api/dist/apps/ocean-api/src/index"]
