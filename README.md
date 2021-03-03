[![codecov](https://codecov.io/gh/DeFiCh/jellyfish/branch/main/graph/badge.svg?token=IYL9K0WROA)](https://codecov.io/gh/DeFiCh/jellyfish)
[![Maintainability](https://api.codeclimate.com/v1/badges/7019f1d74a0500951b2a/maintainability)](https://codeclimate.com/github/DeFiCh/jellyfish/maintainability)
[![TS-Standard](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard)
[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish)

# @defichain/jellyfish

A collection of TypeScript + JavaScript tools and libraries for DeFiChain to build decentralized finance on Bitcoin.

> 🚧 Work in progress.

## Usage

For the majority of the time, you just need `@defichain/jellyfish`.

### Installation

```shell
npm i @defichain/jellyfish
```

### Setting a client

```js
// TODO(fuxingloh): 
```

|package|@latest|@next|
|---|---|---|
|`@defichain/jellyfish`|![npm](https://img.shields.io/npm/v/@defichain/jellyfish)|![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish/next)|
|`@defichain/jellyfish-core`|![npm](https://img.shields.io/npm/v/@defichain/jellyfish-core)|![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish-core/next)|
|`@defichain/jellyfish-jsonrpc`|![npm](https://img.shields.io/npm/v/@defichain/jellyfish-jsonrpc)|![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish-jsonrpc/next)|
|`@defichain/testcontainers`|![npm](https://img.shields.io/npm/v/@defichain/testcontainers)|![npm@next](https://img.shields.io/npm/v/@defichain/testcontainers/next)|

## Features

```js
// TODO(fuxingloh): 
```

## Documentation & Community

```js
// TODO(fuxingloh): 
```

## Motivation & Philosophy

```js
// TODO(fuxingloh): 
```

## Developing & Contributing

Thanks for contributing, here is our [contributing guidelines](CONTRIBUTING.md).

We use `npm 7` for this project, it's required to set
up [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

```shell
npm install
```

### Testing

`jest.config.js` is set up at the root project level as well as at each sub module. You can run jest at root to test all
modules or individually at each sub module. If you use IntelliJ IDEA, you can right click any file to test it
individually and have it reported to the IDE.

Docker is required to run the tests as [`@defichain/testcontainers`](./packages/testcontainers) will automatically spin
up `regtest` instances for testing.

Coverage is collected at merge with `codecov`; more testing 🚀 less 🐛 = 😎

```shell
jest
```

### IntelliJ IDEA

IntelliJ IDEA is the IDE of choice for writing and maintaining this library. IntelliJ's files are included for
convenience with basic toolchain setup but use of IntelliJ is totally optional.

### Security issues

If you discover a security vulnerability in
`@defichain/jellyfish`, [please see submit it privately](https://github.com/DeFiCh/.github/blob/main/SECURITY.md).

## License & Disclaimer

By using `@defichain/jellyfish` (this repo), you (the user) agree to be bound by [the terms of this license](LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish?ref=badge_large)
