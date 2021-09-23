---
id: introduction
title: Introduction
sidebar_label: Introduction
slug: /
---

## What is Jellyfish?

A collection of TypeScript + JavaScript tools and libraries for DeFi Blockchain developers to build decentralized 
finance on Bitcoin. Consisting of multiple packages with more to be added in the future, this JS library enables 
developers to create decentralized applications on top of DeFi Blockchain that are modern, easy to use and easy to 
test.

Written in TypeScript, jellyfish provides first-class citizen support for TypeScript with strongly typed interfaces of
DeFi Blockchain rpc exchanges. Built using modern JavaScript approaches, it emphasises a **future-first developer experience**
and backport for compatibility. The protocol-agnostic core enables independent communication protocols, allowing
vendor-agnostic middleware adaptable to any needs.

### Monorepo & packages 

As with all modern JavaScript projects, jellyfish follows a monorepo structure with its concerns separated. All packages
maintained in this repo are published with the same version tag and follows the `DeFiCh/ain` releases.

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
