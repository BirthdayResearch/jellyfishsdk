FROM node:16-alpine3.13

WORKDIR /app

COPY --from=defi/jellyfish ./app .
COPY . ./apps/legacy-api

RUN npm ci
RUN npm run build --workspace=apps/legacy-api

CMD ["node", "apps/legacy-api/dist/index"]
