[![CI](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml/badge.svg)](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DeFiCh/jellyfish/branch/main/graph/badge.svg?token=IYL9K0WROA)](https://codecov.io/gh/DeFiCh/jellyfish)
[![Maintainability](https://api.codeclimate.com/v1/badges/7019f1d74a0500951b2a/maintainability)](https://codeclimate.com/github/DeFiCh/jellyfish/maintainability)
[![TS-Standard](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard)
[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish)

# [@defichain/jellyfish](https://jellyfish.defichain.com)

DeFiChain SDK. A collection of TypeScript + JavaScript tools and libraries for DeFi Blockchain developers to build
decentralized finance on Bitcoin.

> 🚧 @defichain/jellyfish is considered BETA SOFTWARE with frequent minor breaking releases. Used in production at
> @defichain. This is a free software, @defichain assumes no responsibility nor liability if there is a bug in the
> implementation.

## Installation

### Node

```shell
npm install @defichain/jellyfish
```

## Getting Started

### CJS for Node

```js
const jellyfish = require('@defichain/jellyfish')
const client = new jellyfish.Client('http://localhost:8554', {
  timeout: 20000
})

client.mining.getMiningInfo().then((info) => {
  console.log(info)
})
```

### ES6 Modules

```js
import {Client} from '@defichain/jellyfish'

const client = new Client('http://localhost:8554')
const info = await client.mining.getMiningInfo()
```

### Providers

```js
import {Client, HttpProvider} from '@defichain/jellyfish'

const options = {} // optional

const user = ''
const password = ''
const port = '8554'
const localClient = new Client(new HttpProvider(`http://${user}:${password}@localhost:${port}/`), options)
```

## Documentation & Community

> [https://jellyfish.defichain.com](https://jellyfish.defichain.com)

[![Netlify Status](https://api.netlify.com/api/v1/badges/c5b7a65e-aeec-4e12-a7b7-300cbc1a8069/deploy-status)](https://app.netlify.com/sites/cranky-franklin-5e59ef/deploys)

Following the idea of everything in the main branch is production ready; all pull request must be accompanied by a
documentation change under the `website/` folder. Hence, the main branch should be treated as a release with
documentations.

### Packages

DeFi Jellyfish follows a monorepo methodology, all maintained packages are in the same repo and published with the same
version tag.

[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish/v/latest)

Package                                            | Description
---------------------------------------------------|-------------
`@defichain/jellyfish`                             | Library bundled usage entrypoint with conventional defaults for 4 bundles: umd, esm, cjs and d.ts
`@defichain/jellyfish-address`                     | Provide address builder, parser, validator utility library for DeFi Blockchain.
`@defichain/jellyfish-api-core`                    | A protocol agnostic DeFi Blockchain client interfaces, with a "foreign function interface" design.
`@defichain/jellyfish-api-jsonrpc`                 | Implements the [JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification for api-core.
`@defichain/jellyfish-crypto`                      | Cryptography operations for jellyfish, includes a simple 'secp256k1' EllipticPair.
`@defichain/jellyfish-json`                        | Allows parsing of JSON with 'lossless', 'bignumber' and 'number' numeric precision.
`@defichain/jellyfish-network`                     | Contains DeFi Blockchain various network configuration for mainnet, testnet and regtest.
`@defichain/jellyfish-testing`                     | Provides many abstractions for various commonly used setup pattern for DeFi Blockchain.
`@defichain/jellyfish-transaction`                 | Dead simple modern stateless raw transaction composer for the DeFi Blockchain.
`@defichain/jellyfish-transaction-builder`         | Provides a high-high level abstraction for constructing transaction ready to be broadcast for DeFi Blockchain.
`@defichain/jellyfish-transaction-signature`       | Stateless utility library to perform transaction signing.
`@defichain/jellyfish-wallet`                      | Jellyfish wallet is a managed wallet, where account can get discovered from an HD seed.
`@defichain/jellyfish-wallet-classic`              | WalletClassic implements a simple, single elliptic pair wallet.
`@defichain/jellyfish-wallet-encrypted`            | Library to encrypt MnemonicHdNode as EncryptedMnemonicHdNode. Able to perform as MnemonicHdNode with passphrase known. 
`@defichain/jellyfish-wallet-mnemonic`             | MnemonicHdNode implements the WalletHdNode from jellyfish-wallet; a CoinType-agnostic HD Wallet for noncustodial DeFi.
`@defichain/testcontainers`                        | Provides a lightweight, throw away instances for DeFiD node provisioned automatically in a Docker container.
~~@defichain/testing~~                             | Provides rich test fixture setup functions for effective and effortless testing.

## Developing & Contributing

Thanks for contributing, appreciate all the help we can get. Feel free to make a pull-request, we will guide you along
the way to make it merge-able. Here are some of our documented [contributing guidelines](CONTRIBUTING.md).

You need `node v14`, and `npm v7` for this project, it's required to set
up [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

```shell
npm install
```

### Project References

For monorepo to work seamlessly, some configuration is required. It's amazing as your code can jump across all
sub-packages, you don't need to build the project in every package when you update or clone.

Configurations required when introducing new package:

1. root `tsconfig.json` - `compilerOptions.paths` - add to map absolute packages name back to the source code
2. root `tsconfig.build.json` - `references` - add new created tsconfig.build.json here
3. sub-package `package.json` - `scripts.build` - ensure each sub-package build script is
   configured `tsc -b ./tsconfig.build.json`

### Testing

`jest.config.js` is set up at the root project level as well as at each submodule. You can run jest at root to test all
modules or individually at each submodule. By default, only regtest chain are used for normal testing. If you use
IntelliJ IDEA, you can right-click any file to test it individually and have it reported to the IDE.

Docker is required to run the tests as [`@defichain/testcontainers`](./packages/testcontainers) will automatically spin
up `regtest` instances for testing. The number of containers it will spin up concurrently is dependent on your
jest `--maxConcurrency` count. Test are known to be flaky due to the usage of multiple Docker containers for test
concurrency. Although testcontainers cleans up after itself, there are cases where the tests fail exceptionally you
might need to occasionally: `docker system prune --volumes`.

Coverage is collected at each pull request to main with `codecov`; more testing 🚀 less 🐛 = 😎

```shell
jest
```

### Publishing

`"version": "0.0.0"` is used because publishing will be done automatically
by [GitHub releases](https://github.com/DeFiCh/jellyfish/releases) with connected workflows. On
release `types: [ published, prereleased ]`, GitHub Action will automatically build all packages in this repo and
publish it into npm.

* release are tagged as `@latest`
* prerelease are tagged as `@next` (please use this cautiously)

### IntelliJ IDEA

IntelliJ IDEA is the IDE of choice for writing and maintaining this library. IntelliJ's files are included for
convenience with basic toolchain setup but use of IntelliJ is totally optional.

### Security issues

If you discover a security vulnerability in
`@defichain/jellyfish`, [please see submit it privately](https://github.com/DeFiCh/.github/blob/main/SECURITY.md).

## License & Disclaimer

By using `@defichain/jellyfish` (this repo), you (the user) agree to be bound by [the terms of this license](LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish?ref=badge_large)
