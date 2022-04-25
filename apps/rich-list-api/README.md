# DeFiChain Rich List API

DeFiChain Rich List API, a stateful microservice to compute and keep rich list.

## Motivation

> https://github.com/JellyfishSDK/jellyfish/issues/1053

Introduce a new application as microservice
allows [Ocean API](https://github.com/JellyfishSDK/jellyfish/tree/main/apps/ocean-api) to push in active addresses
(which conducted transaction on DeFiChain) and publishes rich list.

## `/apps/rich-list-api`

The server of rich-list-api, build with @nestjs, consists of implementation for 3 main modules.

- ### `/database` - a persistent storage service
- ### `/queue` - a LIFO queue service
- ### `/api` - a gateway for client to push active addresses and read latest rich list

## Related Packages

### `/packages/rich-list-client`

> Provides the protocol core for communicating between client and server. Within `rich-api-client`, it contains a shared
> response and exception structure.

The TypeScript client to interact with [rich-list-api](###/api).

### `/packages/rich-list-core`

> This package is not published, for internal use within `@defichain-apps/rich-list-api` only.

`@defichain/rich-list-core` consists of most of the core logic and implementation of `rich-list-api` with two dependency
modules being injectable. By providing dependencies specification (interface) to allows core logic being developed and
tested without any specified infrastructure.
