# DeFiChain Ocean API

DeFiChain Ocean API, next^2 generation API for building scalable Native DeFi Apps.

## Motivation

> https://github.com/DeFiCh/jellyfish/issues/580

As part of [#580](https://github.com/DeFiCh/jellyfish/issues/580) consolidation efforts. We had multiple projects that
were extensions of the jellyfish project. The separated projects allowed us to move quickly initially but proves to be a
bottleneck when it comes to development.

By including Ocean API development with jellyfish, it creates a better synergy of DeFiChain open source development
across concerns. Singular versioning, source of truth, documentation of entirety of defichain
via [jellyfish.defichain.com](https://jellyfish.defichain.com).

## Packages

### `/packages/ocean-api-client`

> Provides the protocol core for communicating between client and server. Within `ocean-api-client`, it contains a shared response and exception structure.

The official JS client for ocean-api. As the development of ocean-api client and server are closely intertwined, this
allows the project to move iteratively together. With them packaged together within the same repo, the server and client
can be released together. This allows us to be the consumer of our own client implementation. Testing each server
endpoint directly with `ocean-api-client`, dogfooding at the maximum.

### `/apps/ocean-api`

The server for ocean-api, build with @nestjs it uses aspect-oriented programming methodology to allow the modular design
of `ocean-api-server`. Featuring 2 main directories `/controllers` and `/modules`.
