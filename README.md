[![CI](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml/badge.svg)](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DeFiCh/jellyfish/branch/main/graph/badge.svg?token=IYL9K0WROA)](https://codecov.io/gh/DeFiCh/jellyfish)
[![Maintainability](https://api.codeclimate.com/v1/badges/7019f1d74a0500951b2a/maintainability)](https://codeclimate.com/github/DeFiCh/jellyfish/maintainability)
[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish)

# [@defichain/jellyfish](https://jellyfish.defichain.com)

> https://jellyfish.defichain.com

DeFiChain Jellyfish SDK. A collection of TypeScript + JavaScript tools and libraries to build Native DeFi products.

<details>
<summary><b>Watch this space!</b></summary>

We are consolidating all jellyfish ecosystem projects ocean, whale, playground, and salmon into this repository.

- For better synergy of DeFiChain open source development across all concerns.
- Consistent versioning for all ecosystem releases with a single source of truth.
- Documentation for the entirety of the jellyfish ecosystem via `jellyfish.defichain.com`. Incorporating sample and
  playground.
- Early regression detection upstream to downstream changes with monolithic repo structure.

</details>

## Installation

> We are deprecating the CJS/UMD bundle in `@defichain/jellyfish`, please use individual packages (`@defichain/jellyfish-*`) for better control of what you need.

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
import { Client } from '@defichain/jellyfish'

const client = new Client('http://localhost:8554')
const info = await client.mining.getMiningInfo()
```

### Providers

```js
import { Client, HttpProvider } from '@defichain/jellyfish'

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
`@defichain/jellyfish-address`                     | Provide address builder, parser, validator utility library for DeFi Blockchain.
`@defichain/jellyfish-api-core`                    | A protocol agnostic DeFi Blockchain client interfaces, with a "foreign function interface" design.
`@defichain/jellyfish-api-jsonrpc`                 | Implements the [JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification for api-core.
`@defichain/jellyfish-buffer`                      | Buffer composer for jellyfish.
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
~~@defichain/jellyfish~~                           | (deprecated) ~~Library bundled usage entrypoint with conventional defaults for 4 bundles: umd, esm, cjs and d.ts~~
~~@defichain/testing~~                             | (deprecated) ~~Provides rich test fixture setup functions for effective and effortless testing.~~

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

#### Unit Testing

Unit testing are created to test each individual units/components of a software. As they are unit tests, they should
accompany each unitized component or module. They follow the naming semantic of `*.test.ts` and are placed together in
the same directory structure in `/__tests__` of the code you are testing. Code coverage is collected for this.

#### End-to-end Testing

On top of unit tests, this provides additional testing that tests the entire lifecycle. All dependencies and modules are
integrated together as expected. They follow the naming semantic of `*.e2e.ts`. Code coverage is collected for this.

For API service endpoints that are meant to be consumed by developer, the testing should also be done in the `*-cient`
packages. Dogfooding at its finest.

#### Sanity Testing

On top of end-to-end testing, sanity testing is done after the docker image is build. This kind of testing is performed
to ascertain the possibility of bugs within the workflow that generate the builds. To identify and determine whether a
build artifact (docker) should be rejected. This is only done on CI and you are not expected to perform them manually.

#### Code coverage

Coverage is collected for all applicable tests at each pull request to main branch with `codecov`. The more testing 🚀
less 🐛 = 😎

### Publishing

`"version": "0.0.0"` is used because publishing will be done automatically
by [GitHub releases](https://github.com/DeFiCh/jellyfish/releases) with connected workflows. On
release `types: [ published, prereleased ]`, GitHub Action will automatically build all packages in this repo and
publish it into npm.

For packages with accompanying docker images, they are published automatically to GitHub Container Registry
(ghcr.io/defich). When a new [GitHub releases](https://github.com/DeFiCh/whale/releases) is triggered, GitHub Action
will automatically build the docker image in this repo and publish it. Two images are created for each release
targeting `linux/amd64` and `linux/arm64`. The latest tag will always be updated with the last release and semantic
release is enforced for each release.

### IntelliJ IDEA

IntelliJ IDEA is the IDE of choice for writing and maintaining this library. IntelliJ's files are included for
convenience with basic toolchain setup but use of IntelliJ is totally optional.

### Security issues

If you discover a security vulnerability in
`@defichain/jellyfish`, [please see submit it privately](https://github.com/DeFiCh/.github/blob/main/SECURITY.md).

## License & Disclaimer

By using `@defichain/jellyfish` (this repo), you (the user) agree to be bound by [the terms of this license](LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish?ref=badge_large)
