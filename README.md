[![CI](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml/badge.svg)](https://github.com/DeFiCh/jellyfish/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DeFiCh/jellyfish/branch/main/graph/badge.svg?token=IYL9K0WROA)](https://codecov.io/gh/DeFiCh/jellyfish)
[![Maintainability](https://api.codeclimate.com/v1/badges/7019f1d74a0500951b2a/maintainability)](https://codeclimate.com/github/DeFiCh/jellyfish/maintainability)
[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish)
[![Netlify Status](https://api.netlify.com/api/v1/badges/c5b7a65e-aeec-4e12-a7b7-300cbc1a8069/deploy-status)](https://app.netlify.com/sites/cranky-franklin-5e59ef/deploys)

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

## Packages

DeFi Jellyfish follows a monorepo methodology, all maintained packages are in the same repo and published with the same
version tag.

[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish/v/latest)

Package                                            | Description
---------------------------------------------------|-------------
`@defichain/jellyfish-address`                     | Provide address builder, parser, validator utility library for DeFi Blockchain.
`@defichain/jellyfish-api-core`                    | A protocol agnostic DeFi Blockchain client interfaces, with a "foreign function interface" design.
`@defichain/jellyfish-api-jsonrpc`                 | Implements the [JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification for api-core.
`@defichain/jellyfish-block`                       | Stateless raw block composer for the DeFi Blockchain.
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
~~@defichain/testing~~                             | (deprecated) ~~Provides rich test fixture setup functions for effective and effortless testing.~~

## Developing & Contributing

Thanks for contributing, appreciate all the help we can get. Feel free to make a pull-request, we will guide you along
the way to make it merge-able. Here are some of our documented [contributing guidelines](CONTRIBUTING.md).

## Security issues

If you discover a security vulnerability in
`DeFiCh/jellyfish`, [please see submit it privately](https://github.com/DeFiCh/.github/blob/main/SECURITY.md).

## License & Disclaimer

By using `DeFiCh/jellyfish` (this repo), you (the user) agree to be bound by [the terms of this license](LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDeFiCh%2Fjellyfish?ref=badge_large)
