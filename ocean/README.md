# DeFiChain Ocean API Development

DeFiChain Ocean API, next^2 generation API for building scalable Native DeFi Apps.

## Motivation

> https://github.com/DeFiCh/jellyfish/issues/580

As part of [#580](https://github.com/DeFiCh/jellyfish/issues/580) consolidation efforts. We had multiple projects that
were extensions of the jellyfish project. The separated projects allowed us to move quickly initially but proves to be a
bottleneck when it comes to development.

By including Ocean API development with jellyfish, it creates better synergy of DeFiChain open source development across
concerns. Singular versioning, source of truth, documentation of entirety of defichain
via [jellyfish.defichain.com](https://jellyfish.defichain.com).

## Packages

### @defichain/ocean-api-core

Provides the protocol core for communicating between client and server. Within `ocean-api-core`, it contains a shared
response and exception structure.

### @defichain/ocean-api-client

The official JS client for ocean-api. As the development of ocean-api client and server are closely intertwined, this
allows the project to move iteratively together. With them packaged together within the same repo, the server and client
can be released together. This allows us to be the consumer of our own client implementation. Testing each server
endpoint directly with `ocean-api-client`, dogfooding at the maximum.

### @defichain/ocean-api-server

The server for ocean-api, build with nestjs it uses aspect-oriented programming methodology to allow modular design
of `ocean-api-server`. Featuring 2 main directory `/controllers` and `/modules`.

### @defichain/ocean-playground

Ocean Playground is a specialized testing blockchain isolated from MainNet for testing DeFi applications. Assets are not
real, it can be minted by anyone. Blocks are configured to generate every 3 seconds, the chain can reset anytime.

Bot is designed as a mechanism that allow bootstrapping with interval cycle. This allows the developer to mock any
behaviors they want with a simulated testing blockchain.
